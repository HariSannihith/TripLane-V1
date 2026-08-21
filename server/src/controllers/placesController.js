'use strict';

const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const placesService = require('../services/placesService');

const search = asyncHandler(async (req, res) => {
  const query = String(req.query.query || '').trim();
  if (query.length < 2) throw ApiError.badRequest('Type at least two characters to search');

  const { source, results } = await placesService.searchPlaces(query);
  res.json({ source, results });
});

const details = asyncHandler(async (req, res) => {
  const { source, place } = await placesService.getPlaceDetails(req.params.placeId);
  res.json({ source, place });
});

/** Image proxy: keeps the Google key on the server and lets the browser cache. */
const photo = asyncHandler(async (req, res) => {
  const ref = String(req.query.ref || '');
  const maxWidth = Math.min(Number(req.query.maxWidth) || 800, 1600);

  const { stream, contentType } = await placesService.fetchPhotoStream(ref, maxWidth);
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  stream.on('error', () => res.destroy());
  stream.pipe(res);
});

module.exports = { search, details, photo };
