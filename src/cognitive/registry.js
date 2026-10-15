// All available cognitive models. To add one: implement SequencingModel in
// a new file and list it here; the UI builds its controls from `params`.

import { RumelhartNormanModel } from './rumelhartNorman.js';
import { CompetitiveQueuingModel } from './competitiveQueuing.js';
import { HierarchicalTwoLoopModel } from './hierarchical.js';
import { Minerva2Model } from './minerva2.js';

export const MODELS = [RumelhartNormanModel, CompetitiveQueuingModel, HierarchicalTwoLoopModel, Minerva2Model];

export const MODEL_BY_ID = new Map(MODELS.map((m) => [m.id, m]));

export function createModel(id, params, rng) {
  const Model = MODEL_BY_ID.get(id);
  if (!Model) throw new Error(`Unknown model: ${id}`);
  return new Model(params, rng);
}
