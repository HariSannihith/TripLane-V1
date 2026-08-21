'use strict';

const axios = require('axios');
const { googlePlacesApiKey } = require('../config/env');
const ApiError = require('../utils/ApiError');

const PLACES_BASE = 'https://places.googleapis.com/v1';
const SEARCH_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.photos',
  'places.editorialSummary',
  'places.types',
].join(',');
const DETAILS_FIELD_MASK = [
  'id',
  'displayName',
  'formattedAddress',
  'location',
  'rating',
  'userRatingCount',
  'photos',
  'editorialSummary',
  'websiteUri',
  'types',
].join(',');

/**
 * Offline catalogue used when GOOGLE_PLACES_API_KEY is not configured, so the
 * planner stays usable in development. Responses carry source:"fallback".
 */
const FALLBACK_PLACES = [
  { id: 'fb-lisbon', name: 'Lisbon', address: 'Lisbon, Portugal', lat: 38.7223, lng: -9.1393, rating: 4.7, summary: 'Hilltop old town, tram 28 and pastel de nata by the Tagus.' },
  { id: 'fb-kyoto', name: 'Kyoto', address: 'Kyoto, Japan', lat: 35.0116, lng: 135.7681, rating: 4.8, summary: 'Temples, bamboo groves and the Gion district.' },
  { id: 'fb-reykjavik', name: 'Reykjavik', address: 'Reykjavik, Iceland', lat: 64.1466, lng: -21.9426, rating: 4.6, summary: 'Northern lights, geothermal pools and the Golden Circle.' },
  { id: 'fb-barcelona', name: 'Barcelona', address: 'Barcelona, Spain', lat: 41.3874, lng: 2.1686, rating: 4.7, summary: 'Gaudi architecture, tapas and city beaches.' },
  { id: 'fb-cape-town', name: 'Cape Town', address: 'Cape Town, South Africa', lat: -33.9249, lng: 18.4241, rating: 4.7, summary: 'Table Mountain, the winelands and coastal drives.' },
  { id: 'fb-queenstown', name: 'Queenstown', address: 'Queenstown, New Zealand', lat: -45.0312, lng: 168.6626, rating: 4.8, summary: 'Adventure capital on Lake Wakatipu.' },
  { id: 'fb-goa', name: 'Goa', address: 'Goa, India', lat: 15.2993, lng: 74.124, rating: 4.5, summary: 'Beaches, Portuguese heritage and night markets.' },
  { id: 'fb-manali', name: 'Manali', address: 'Manali, Himachal Pradesh, India', lat: 32.2396, lng: 77.1887, rating: 4.5, summary: 'Himalayan valley town for treks and snow.' },
  { id: 'fb-bali', name: 'Bali', address: 'Bali, Indonesia', lat: -8.4095, lng: 115.1889, rating: 4.6, summary: 'Rice terraces, surf breaks and temple towns.' },
  { id: 'fb-marrakesh', name: 'Marrakesh', address: 'Marrakesh, Morocco', lat: 31.6295, lng: -7.9811, rating: 4.6, summary: 'Medina souks, riads and Atlas day trips.' },
  { id: 'fb-prague', name: 'Prague', address: 'Prague, Czechia', lat: 50.0755, lng: 14.4378, rating: 4.7, summary: 'Old Town square, the castle district and beer halls.' },
  { id: 'fb-banff', name: 'Banff', address: 'Banff, Alberta, Canada', lat: 51.1784, lng: -115.5708, rating: 4.8, summary: 'Turquoise lakes and Rocky Mountain trails.' },
];

const isConfigured = () => Boolean(googlePlacesApiKey);

function normalizeGooglePlace(place) {
  return {
    placeId: place.id,
    name: place.displayName?.text || 'Unnamed place',
    address: place.formattedAddress || '',
    location: {
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
    },
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount: place.userRatingCount ?? null,
    // `photos[].name` is an opaque resource path we proxy through our own API so
    // the Google key never reaches the browser.
    photoRef: place.photos?.[0]?.name || null,
    summary: place.editorialSummary?.text || '',
    types: place.types || [],
    websiteUri: place.websiteUri || null,
  };
}

function fallbackToPlace(entry) {
  return {
    placeId: entry.id,
    name: entry.name,
    address: entry.address,
    location: { lat: entry.lat, lng: entry.lng },
    rating: entry.rating,
    userRatingCount: null,
    photoRef: null,
    summary: entry.summary,
    types: ['locality'],
    websiteUri: null,
  };
}

function searchFallback(query) {
  const needle = String(query || '').trim().toLowerCase();
  const matches = FALLBACK_PLACES.filter(
    (entry) =>
      !needle ||
      entry.name.toLowerCase().includes(needle) ||
      entry.address.toLowerCase().includes(needle) ||
      entry.summary.toLowerCase().includes(needle)
  );
  const results = (matches.length ? matches : FALLBACK_PLACES).slice(0, 8);
  return { source: 'fallback', results: results.map(fallbackToPlace) };
}

function wrapGoogleError(err, action) {
  const status = err.response?.status;
  const googleMessage = err.response?.data?.error?.message;
  console.error(`[places] ${action} failed`, status || err.code, googleMessage || err.message);

  if (status === 400) return ApiError.badRequest(googleMessage || 'Google rejected that place query');
  if (status === 401 || status === 403) {
    return new ApiError(
      502,
      'Google Places rejected the API key. Check GOOGLE_PLACES_API_KEY and that Places API (New) is enabled.'
    );
  }
  if (status === 429) return new ApiError(429, 'Google Places rate limit reached, try again shortly');
  return new ApiError(502, 'Could not reach Google Places right now');
}

async function searchPlaces(query) {
  if (!isConfigured()) return searchFallback(query);

  try {
    const { data } = await axios.post(
      `${PLACES_BASE}/places:searchText`,
      { textQuery: query, maxResultCount: 8 },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': googlePlacesApiKey,
          'X-Goog-FieldMask': SEARCH_FIELD_MASK,
        },
        timeout: 10000,
      }
    );
    return { source: 'google', results: (data.places || []).map(normalizeGooglePlace) };
  } catch (err) {
    throw wrapGoogleError(err, 'text search');
  }
}

async function getPlaceDetails(placeId) {
  if (!isConfigured()) {
    const entry = FALLBACK_PLACES.find((place) => place.id === placeId);
    if (!entry) throw ApiError.notFound('Place not found');
    return { source: 'fallback', place: fallbackToPlace(entry) };
  }

  try {
    const { data } = await axios.get(`${PLACES_BASE}/places/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': googlePlacesApiKey,
        'X-Goog-FieldMask': DETAILS_FIELD_MASK,
      },
      timeout: 10000,
    });
    return { source: 'google', place: normalizeGooglePlace(data) };
  } catch (err) {
    if (err.response?.status === 404) throw ApiError.notFound('Place not found');
    throw wrapGoogleError(err, 'place details');
  }
}

/** Streams a Places photo through our API so the key stays server-side. */
async function fetchPhotoStream(photoRef, maxWidth = 800) {
  if (!isConfigured()) {
    throw ApiError.notFound('Photos are unavailable without a Google Places API key');
  }
  if (!/^places\/[A-Za-z0-9_-]+\/photos\/[A-Za-z0-9_-]+$/.test(photoRef)) {
    throw ApiError.badRequest('Malformed photo reference');
  }

  try {
    const response = await axios.get(`${PLACES_BASE}/${photoRef}/media`, {
      params: { maxWidthPx: maxWidth, key: googlePlacesApiKey },
      responseType: 'stream',
      timeout: 10000,
    });
    return { stream: response.data, contentType: response.headers['content-type'] || 'image/jpeg' };
  } catch (err) {
    throw wrapGoogleError(err, 'photo fetch');
  }
}

module.exports = { searchPlaces, getPlaceDetails, fetchPhotoStream, isConfigured };
