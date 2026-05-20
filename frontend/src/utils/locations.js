export const ENDPOINT_LOCATION_MAP = {
  pc_1: {
    city: "Chittur",
    state: "Kerala",
    country: "India",
    latitude: 10.6997,
    longitude: 76.7471,
  },
  pc_2: {
    city: "Coimbatore",
    state: "Tamil Nadu",
    country: "India",
    latitude: 11.0168,
    longitude: 76.9558,
  },
  pc_3: {
    city: "Thrissur",
    state: "Kerala",
    country: "India",
    latitude: 10.5276,
    longitude: 76.2144,
  },
  "soc-thrissur-01": {
    city: "Thrissur",
    state: "Kerala",
    country: "India",
    latitude: 10.5276,
    longitude: 76.2144,
  },
  "soc-kochi-01": {
    city: "Kochi",
    state: "Kerala",
    country: "India",
    latitude: 9.9312,
    longitude: 76.2673,
  },
  "soc-bangalore-01": {
    city: "Bangalore",
    state: "Karnataka",
    country: "India",
    latitude: 12.9716,
    longitude: 77.5946,
  },
  "soc-mumbai-01": {
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    latitude: 19.076,
    longitude: 72.8777,
  },
  "soc-singapore-01": {
    city: "Singapore",
    state: "Central",
    country: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
  },
  "soc-tokyo-01": {
    city: "Tokyo",
    state: "Tokyo",
    country: "Japan",
    latitude: 35.6762,
    longitude: 139.6503,
  },
  "soc-london-01": {
    city: "London",
    state: "England",
    country: "United Kingdom",
    latitude: 51.5072,
    longitude: -0.1276,
  },
  "soc-newyork-01": {
    city: "New York",
    state: "New York",
    country: "United States",
    latitude: 40.7128,
    longitude: -74.006,
  },
};

export function getEndpointLocation(pcName = "") {
  return ENDPOINT_LOCATION_MAP[String(pcName).trim().toLowerCase()] || null;
}

export function projectLatLong(latitude, longitude) {
  return {
    x: ((Number(longitude) + 180) / 360) * 100,
    y: ((90 - Number(latitude)) / 180) * 100,
  };
}
