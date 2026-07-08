import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';

/// Filtres ville / commune pour l'annuaire pharmacies.
class PharmacyCityFilters extends StatefulWidget {
  const PharmacyCityFilters({
    super.key,
    required this.onChanged,
    this.city,
    this.district,
  });

  final String? city;
  final String? district;
  final void Function(String? city, String? district) onChanged;

  @override
  State<PharmacyCityFilters> createState() => _PharmacyCityFiltersState();
}

class _PharmacyCityFiltersState extends State<PharmacyCityFilters> {
  final _api = ApiClient();
  List<String> _cities = [];
  List<String> _districts = [];
  bool _loadingCities = true;
  String? _loadError;

  static const _fallbackCities = [
    'Abidjan',
    'Bouaké',
    'Yamoussoukro',
    'Daloa',
    'San-Pédro',
    'Korhogo',
    'Gagnoa',
    'Man',
  ];

  static const _abidjanDistricts = [
    'Cocody',
    'Yopougon',
    'Plateau',
    'Marcory',
    'Abobo',
    'Koumassi',
    'Adjamé',
    'Treichville',
    'Riviera',
    'Port-Bouët',
  ];

  @override
  void initState() {
    super.initState();
    _loadCities();
  }

  @override
  void didUpdateWidget(PharmacyCityFilters oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.city != widget.city) {
      _loadDistricts(widget.city);
    }
  }

  Future<void> _loadCities() async {
    try {
      final res = await _api.get('/pharmacies/cities/list', auth: false);
      final raw = ((res['data'] as List?) ?? []).cast<String>();
      final normalized = <String>{};
      for (final c in raw) {
        final clean = _cleanCity(c);
        if (clean.isNotEmpty) normalized.add(clean);
      }
      if (normalized.isEmpty) normalized.addAll(_fallbackCities);

      final sorted = normalized.toList()..sort((a, b) {
        final ai = _fallbackCities.indexOf(a);
        final bi = _fallbackCities.indexOf(b);
        if (ai >= 0 && bi >= 0) return ai.compareTo(bi);
        if (ai >= 0) return -1;
        if (bi >= 0) return 1;
        return a.compareTo(b);
      });

      if (!mounted) return;
      setState(() {
        _cities = sorted;
        _loadingCities = false;
        _loadError = null;
      });
      if (widget.city != null) _loadDistricts(widget.city);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _cities = List.from(_fallbackCities);
        _loadingCities = false;
        _loadError = 'Hors ligne — liste locale';
      });
    }
  }

  Future<void> _loadDistricts(String? city) async {
    if (city == null || city.isEmpty) {
      setState(() => _districts = []);
      return;
    }
    if (city == 'Abidjan') {
      setState(() => _districts = List.from(_abidjanDistricts));
    }
    try {
      final res = await _api.get('/pharmacies/districts/list?city=${Uri.encodeComponent(city)}', auth: false);
      final raw = ((res['data'] as List?) ?? []).cast<String>();
      final districts = raw.map(_cleanDistrict).where((d) => d.isNotEmpty).toSet().toList()..sort();
      if (!mounted) return;
      setState(() {
        if (districts.isNotEmpty) {
          _districts = districts;
        } else if (city == 'Abidjan') {
          _districts = List.from(_abidjanDistricts);
        }
      });
    } catch (_) {
      if (city == 'Abidjan' && mounted) {
        setState(() => _districts = List.from(_abidjanDistricts));
      }
    }
  }

  String _cleanCity(String raw) {
    var s = raw.trim();
    if (s.toLowerCase().contains('abidjan')) return 'Abidjan';
    if (s.toLowerCase() == 'bouake') return 'Bouaké';
    if (s.toLowerCase().contains('yamoussoukro')) return 'Yamoussoukro';
    if (s.toLowerCase().contains('san') && s.toLowerCase().contains('pedro')) return 'San-Pédro';
    if (s.length > 1) s = s[0].toUpperCase() + s.substring(1);
    return s;
  }

  String _cleanDistrict(String raw) {
    var s = raw.trim();
    if (s.isEmpty) return s;
    s = s.replaceAll(RegExp(r'^abidjan[\s\-]*', caseSensitive: false), '');
    if (s.isEmpty) return raw.trim();
    return s[0].toUpperCase() + s.substring(1);
  }

  @override
  Widget build(BuildContext context) {
    if (_loadingCities) {
      return const SizedBox(
        height: 48,
        child: Center(child: SizedBox(width: 22, height: 22, child: CircularProgressIndicator(strokeWidth: 2))),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (_loadError != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 6, left: 16, right: 16),
            child: Text(_loadError!, style: const TextStyle(fontSize: 11, color: AppColors.amber600)),
          ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: [
              Expanded(
                child: _dropdown(
                  hint: 'Ville',
                  value: widget.city,
                  items: _cities,
                  onChanged: (v) {
                    widget.onChanged(v, null);
                    _loadDistricts(v);
                  },
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _dropdown(
                  hint: 'Commune',
                  value: widget.district,
                  items: widget.city != null ? _districts : <String>[],
                  enabled: widget.city != null && _districts.isNotEmpty,
                  onChanged: widget.city != null ? (v) => widget.onChanged(widget.city, v) : null,
                ),
              ),
              if (widget.city != null || widget.district != null)
                IconButton(
                  onPressed: () => widget.onChanged(null, null),
                  icon: const Icon(Icons.close, size: 20, color: AppColors.brand600),
                  tooltip: 'Effacer',
                ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _dropdown({
    required String hint,
    required String? value,
    required List<String> items,
    required ValueChanged<String?>? onChanged,
    bool enabled = true,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      decoration: BoxDecoration(
        color: enabled ? Colors.white : AppColors.surfaceMuted,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: enabled ? AppColors.brand600.withValues(alpha: 0.35) : AppColors.border),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          isExpanded: true,
          isDense: false,
          value: value != null && items.contains(value) ? value : null,
          hint: Text(hint, style: TextStyle(fontSize: 13, color: enabled ? AppColors.slate600 : AppColors.slate400)),
          style: const TextStyle(fontSize: 13, color: AppColors.slate900, fontWeight: FontWeight.w500),
          dropdownColor: Colors.white,
          iconEnabledColor: AppColors.brand600,
          iconDisabledColor: AppColors.slate400,
          items: items
              .map((e) => DropdownMenuItem(
                    value: e,
                    child: Text(e, style: const TextStyle(fontSize: 13, color: AppColors.slate900)),
                  ))
              .toList(),
          onChanged: enabled ? onChanged : null,
        ),
      ),
    );
  }
}

String buildPharmacyQuery({
  required String locationQueryParams,
  String? city,
  String? district,
  bool onDutyOnly = false,
  int radiusKm = 30,
}) {
  final parts = <String>[];
  if (city != null && city.isNotEmpty) {
    parts.add('city=${Uri.encodeComponent(city)}');
    if (district != null && district.isNotEmpty) {
      parts.add('district=${Uri.encodeComponent(district)}');
    }
    parts.add(locationQueryParams);
    parts.add('radius=100');
  } else {
    parts.add(locationQueryParams);
    parts.add('radius=$radiusKm');
  }
  if (onDutyOnly) parts.add('isOnDuty=true');
  return parts.join('&');
}
