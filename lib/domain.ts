import type { Requirement, TargetRegion } from "./types";

export type PathwayDomain = {
  id: string;
  region: TargetRegion;
  country: string;
  name: string;
  shortDescription: string;
  requirements: Requirement[];
  baseScoreThreshold?: number; 
};

import pathwayData from "../data/pathways.json";

export const PATHWAY_REGISTRY: PathwayDomain[] = pathwayData as PathwayDomain[];

export function getPathwaysForRegion(region: TargetRegion): PathwayDomain[] {
  const matched = PATHWAY_REGISTRY.filter(p => p.region === region);
  return matched.length > 0 ? matched : PATHWAY_REGISTRY;
}
