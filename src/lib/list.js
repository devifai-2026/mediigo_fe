/**
 * A value that should be a list, as a list.
 *
 * `x ?? []` only catches null and undefined. A slow or failing request can
 * also hand a component an object (an { ok, data } envelope) or a string (a
 * host's HTML error page), and calling .map on either took the whole screen
 * down — "n.map is not a function" until the next reload. Anything that is
 * not an array reads as empty instead.
 */
export const asList = (v) => (Array.isArray(v) ? v : []);
