import { NPC } from '../characters/NPC.js';

/**
 * Registro de tipos de entidad que pueden aparecer en la definición de un nivel.
 *
 * Para añadir un tipo nuevo (un objeto, un enemigo, una puerta…):
 *   registerEntityType('puerta', Puerta);
 * y en el nivel:  { type: 'puerta', x: 100, y: 200, ... }
 */
const types = new Map();

export function registerEntityType(name, EntityClass) {
  types.set(name, EntityClass);
}

export function createEntity(spec) {
  const EntityClass = types.get(spec.type);
  if (!EntityClass) throw new Error(`Tipo de entidad desconocido: "${spec.type}"`);
  const { type: _type, ...options } = spec;
  return new EntityClass(options);
}

registerEntityType('npc', NPC);
