import axios from 'axios';

async function debugGoogleAPI() {
  console.log('🔍 Debugging Google Maps API call...\n');

  const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_MAPS_API_KEY;
  const origin = '47.2981,8.4483'; // Hedingen
  const destination = '46.4167,7.7667'; // Lauchernalp

  console.log('API Key found:', !!apiKey);
  if (apiKey) {
    console.log('API Key starts with:', apiKey.substring(0, 10) + '...');
  }

  const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
  const requestBody = {
    origin: {
      location: {
        latLng: {
          latitude: parseFloat(origin.split(',')[0]),
          longitude: parseFloat(origin.split(',')[1])
        }
      }
    },
    destination: {
      location: {
        latLng: {
          latitude: parseFloat(destination.split(',')[0]),
          longitude: parseFloat(destination.split(',')[1])
        }
      }
    },
    travelMode: 'DRIVE',
    routingPreference: 'TRAFFIC_UNAWARE',
    computeAlternativeRoutes: false,
    routeModifiers: {
      avoidTolls: true
    },
    languageCode: 'en-US',
    units: 'METRIC'
  };

  console.log('Making API call to:', url);
  console.log('Origin:', origin, '(Hedingen)');
  console.log('Destination:', destination, '(Lauchernalp)');

  try {
    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration'
      }
    });

    console.log('\n📡 API Response:');
    console.log('Routes found:', response.data.routes?.length || 0);

    if (response.data.routes && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      const distanceKm = Math.round((route.distanceMeters / 1000) * 10) / 10;

      // Parse duration - can be ISO 8601 or seconds format
      let totalMinutes: number;

      if (route.duration.startsWith('PT')) {
        // ISO 8601 format
        const durationMatch = route.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (durationMatch) {
          const hours = parseInt(durationMatch[1] || '0');
          const minutes = parseInt(durationMatch[2] || '0');
          totalMinutes = hours * 60 + minutes;
        } else {
          console.log('Invalid ISO 8601 duration format:', route.duration);
          return;
        }
      } else if (route.duration.endsWith('s')) {
        // Seconds format
        const seconds = parseInt(route.duration.replace('s', ''));
        totalMinutes = Math.round(seconds / 60);
      } else {
        console.log('Unknown duration format:', route.duration);
        return;
      }

      console.log('✅ Route found!');
      console.log('Distance:', distanceKm, 'km');
      console.log('Duration:', totalMinutes, 'minutes');
    } else {
      console.log('❌ No routes found');
      if (response.data.error) {
        console.log('Error:', response.data.error.message);
      }
    }
  } catch (error: any) {
    console.log('❌ Network error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

debugGoogleAPI().catch(console.error);
