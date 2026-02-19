// Haversine formula to calculate distance between two lat/lng points
export function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Campus center reference point
const CAMPUS_LAT = 42.2780;
const CAMPUS_LNG = -83.7382;

export async function geocodeAddress(address: string): Promise<{
  lat: number;
  lng: number;
  formatted_address: string;
  distance_miles: number;
} | null> {
  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${process.env.GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      const distance = haversine(CAMPUS_LAT, CAMPUS_LNG, location.lat, location.lng);

      return {
        lat: location.lat,
        lng: location.lng,
        formatted_address: data.results[0].formatted_address,
        distance_miles: distance
      };
    }

    return null;
  } catch (error) {
    console.error('Geocoding failed:', error);
    return null;
  }
}
