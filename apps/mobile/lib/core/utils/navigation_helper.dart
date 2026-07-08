import 'package:url_launcher/url_launcher.dart';

class NavigationHelper {
  NavigationHelper._();

  static Future<bool> openDirections({
    required double lat,
    required double lng,
    double? originLat,
    double? originLng,
  }) async {
    final destination = '$lat,$lng';
    final origin = originLat != null && originLng != null ? '$originLat,$originLng' : null;
    final googleUri = origin != null
        ? Uri.parse(
            'https://www.google.com/maps/dir/?api=1&origin=$origin&destination=$destination&travelmode=driving',
          )
        : Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$destination&travelmode=driving');

    if (await canLaunchUrl(googleUri)) {
      return launchUrl(googleUri, mode: LaunchMode.externalApplication);
    }

    final geoUri = Uri.parse('geo:$destination?q=$destination');
    if (await canLaunchUrl(geoUri)) {
      return launchUrl(geoUri, mode: LaunchMode.externalApplication);
    }
    return false;
  }
}
