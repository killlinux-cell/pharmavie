import 'package:geolocator/geolocator.dart';

/// Position par défaut : Plateau, Abidjan
const defaultLat = 5.3197;
const defaultLng = -4.0268;

class UserLocation {
  const UserLocation({
    required this.latitude,
    required this.longitude,
    this.fromGps = false,
    this.label = 'Abidjan',
  });

  final double latitude;
  final double longitude;
  final bool fromGps;
  final String label;

  String get queryParams => 'lat=$latitude&lng=$longitude';
}

class LocationService {
  LocationService._();
  static final instance = LocationService._();

  UserLocation? _cached;

  Future<UserLocation> getLocation() async {
    if (_cached != null) return _cached!;

    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        _cached = const UserLocation(latitude: defaultLat, longitude: defaultLng, label: 'Abidjan (défaut)');
        return _cached!;
      }

      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(accuracy: LocationAccuracy.medium, timeLimit: Duration(seconds: 8)),
      );

      _cached = UserLocation(
        latitude: pos.latitude,
        longitude: pos.longitude,
        fromGps: true,
        label: 'Près de vous',
      );
      return _cached!;
    } catch (_) {
      _cached = const UserLocation(latitude: defaultLat, longitude: defaultLng, label: 'Abidjan (défaut)');
      return _cached!;
    }
  }

  Future<UserLocation> refresh() async {
    _cached = null;
    return getLocation();
  }
}
