"""
Build a per-hex FeatureCollection with refreshed GridScore values.

Reads:
- datacenter_scores_real.csv
- hex_weather_data_all.csv
- public/data/score_map.json (for geometry + lat/lon + existing region tags)

Outputs:
- public/data/score_map_hex.json
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).parent
SCORES_PATH = ROOT / "datacenter_scores_real.csv"
HEX_CLIMATE_PATH = ROOT / "hex_weather_data_all.csv"
BASE_MAP_PATH = ROOT / "public/data/score_map.json"
OUTPUT_PATH = ROOT / "public/data/score_map_hex.json"


def minmax_clamped(series: pd.Series, lower_q: float = 0.01, upper_q: float = 0.99) -> pd.Series:
  """Normalize to 0-1 after clipping to percentile bounds."""
  lo, hi = series.quantile(lower_q), series.quantile(upper_q)
  rng = hi - lo if hi > lo else 1
  return ((series.clip(lo, hi) - lo) / rng).fillna(0.5)


def load_base_data():
  scores_df = pd.read_csv(SCORES_PATH)
  hex_df = pd.read_csv(HEX_CLIMATE_PATH)

  with BASE_MAP_PATH.open() as f:
    fc = json.load(f)
  features = fc.get("features", [])

  lat_lon_rows = []
  region_rows = []
  for feat in features:
    props = feat.get("properties", {}) or {}
    hid = props.get("hex_id")
    lat = props.get("lat")
    lon = props.get("lon")
    reg = props.get("region")
    if hid is not None and lat is not None and lon is not None:
      lat_lon_rows.append({"hex_id": hid, "lat": lat, "lon": lon})
    if hid is not None and reg is not None:
      region_rows.append({"hex_id": hid, "region": reg})

  latlon_df = pd.DataFrame(lat_lon_rows).drop_duplicates("hex_id")
  region_df = pd.DataFrame(region_rows).drop_duplicates("hex_id")

  # Attach coords and existing region tags
  hex_df = hex_df.merge(latlon_df, on="hex_id", how="left")
  if "region" in hex_df.columns:
    hex_df = hex_df.drop(columns=["region"])
  hex_df = hex_df.merge(region_df, on="hex_id", how="left")

  return scores_df, hex_df, features


def assign_region_if_missing(hex_df: pd.DataFrame, scores_df: pd.DataFrame) -> pd.DataFrame:
  if hex_df["region"].notna().all():
    return hex_df

  region_centroids = scores_df[["region", "lat", "lon"]].rename(columns={"lat": "region_lat", "lon": "region_lon"})
  regions_np = region_centroids[["region", "region_lat", "region_lon"]].to_numpy()

  def haversine_vec(lat, lon, region_mat):
    phi1 = np.radians(lat)
    phi2 = np.radians(region_mat[:, 1].astype(float))
    dphi = np.radians(region_mat[:, 1].astype(float) - lat)
    dlambda = np.radians(region_mat[:, 2].astype(float) - lon)
    a = np.sin(dphi / 2.0) ** 2 + np.cos(phi1) * np.cos(phi2) * np.sin(dlambda / 2.0) ** 2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    return 6371000 * c

  regions = []
  dists = []
  for _, row in hex_df.iterrows():
    lat, lon = row.get("lat"), row.get("lon")
    if pd.isna(lat) or pd.isna(lon):
      regions.append(row.get("region"))
      dists.append(np.nan)
      continue
    dist_arr = haversine_vec(lat, lon, regions_np)
    idx = np.argmin(dist_arr)
    regions.append(regions_np[idx, 0])
    dists.append(float(dist_arr[idx]))

  hex_df = hex_df.copy()
  hex_df["region"] = hex_df["region"].fillna(pd.Series(regions, index=hex_df.index))
  hex_df["dist_to_region_m"] = dists
  return hex_df


def compute_hex_scores(hex_df: pd.DataFrame) -> pd.DataFrame:
  hex_df = hex_df.copy()
  hex_df["temp_norm"] = minmax_clamped(hex_df["local_temp_c"])
  hex_df["temp_cool_score"] = 1 - hex_df["temp_norm"]
  hex_df["elev_norm"] = minmax_clamped(hex_df["elevation_m"])

  # Micro-weights tuned for smoother transitions
  TEMP_WEIGHT = 0.15
  ELEV_WEIGHT = 0.05
  SMOOTH_K = 20
  SMOOTH_BLEND = 0.25

  hex_df["sustainability_hex"] = (
    hex_df["sustainability"]
    + hex_df["temp_cool_score"] * TEMP_WEIGHT
    + hex_df["elev_norm"] * ELEV_WEIGHT
  )
  hex_df["profitability_hex"] = hex_df["profitability"]
  hex_df["dc_score_hex"] = 0.6 * hex_df["sustainability_hex"] + 0.4 * hex_df["profitability_hex"]

  coords = hex_df[["lat", "lon"]].to_numpy()
  values = hex_df["dc_score_hex"].to_numpy()

  def knn_smooth(coords_arr, vals, k=SMOOTH_K, self_weight=SMOOTH_BLEND):
    smoothed = np.array(vals, copy=True)
    valid = ~np.isnan(coords_arr).any(axis=1)
    valid_count = int(valid.sum())
    if valid_count < 2:
      return smoothed

    k_eff = max(1, min(k, valid_count - 1))
    coords_valid = coords_arr[valid]
    vals_valid = vals[valid]

    # haversine distances for better spatial smoothing
    lat = np.radians(coords_valid[:, 0])[:, None]
    lon = np.radians(coords_valid[:, 1])[:, None]
    lat_T = lat.T
    lon_T = lon.T
    dphi = lat - lat_T
    dlambda = lon - lon_T
    a = np.sin(dphi / 2.0) ** 2 + np.cos(lat) * np.cos(lat_T) * np.sin(dlambda / 2.0) ** 2
    dist = 2 * 6371000 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))
    np.fill_diagonal(dist, np.inf)

    knn_idx = np.argpartition(dist, kth=k_eff - 1, axis=1)[:, :k_eff]
    neighbor_means = vals_valid[knn_idx].mean(axis=1)
    smoothed_valid = self_weight * vals_valid + (1 - self_weight) * neighbor_means
    smoothed[valid] = smoothed_valid
    return smoothed

  hex_df["dc_score_hex_smooth"] = knn_smooth(coords, values)
  return hex_df


def update_features(features, scored_df: pd.DataFrame):
  by_hex = {f.get("properties", {}).get("hex_id"): f for f in features}
  for _, row in scored_df.iterrows():
    hid = row["hex_id"]
    if hid not in by_hex:
      continue
    feat = by_hex[hid]
    props = feat.get("properties", {}) or {}

    props.update(
      {
        "hex_id": int(hid),
        "region": row.get("region"),
        "lat": row.get("lat"),
        "lon": row.get("lon"),
        "local_temp_c": row.get("local_temp_c"),
        "elevation_m": row.get("elevation_m"),
        "temp_cool_score": row.get("temp_cool_score"),
        "elev_norm": row.get("elev_norm"),
        "dist_to_region": row.get("dist_to_region_m"),
        # Per-hex scores (overwrite legacy values)
        "profitability": row.get("profitability_hex"),
        "sustainability": row.get("sustainability_hex"),
        "dc_score": row.get("dc_score_hex"),
        "dc_score_smooth": row.get("dc_score_hex_smooth"),
        "dc_score_temp": row.get("dc_score_hex"),  # cooling-adjusted aligns with dc_score_hex here
      }
    )
    feat["properties"] = props

  return features


def main():
  scores_df, hex_df, features = load_base_data()
  hex_df = assign_region_if_missing(hex_df, scores_df)

  merged = hex_df.merge(scores_df, on="region", how="left", suffixes=("", "_region"))
  scored = compute_hex_scores(merged)

  updated_features = update_features(features, scored)
  out_fc = {"type": "FeatureCollection", "features": updated_features}
  OUTPUT_PATH.write_text(json.dumps(out_fc))
  print(f"Wrote {OUTPUT_PATH} with {len(updated_features)} features")


if __name__ == "__main__":
  main()
