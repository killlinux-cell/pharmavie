import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';

class SpecialistsDirectoryScreen extends StatefulWidget {
  const SpecialistsDirectoryScreen({super.key});

  @override
  State<SpecialistsDirectoryScreen> createState() => _SpecialistsDirectoryScreenState();
}

class _SpecialistsDirectoryScreenState extends State<SpecialistsDirectoryScreen> {
  final _api = ApiClient();
  String _query = '';
  String _filter = 'Tous';
  List<dynamic> _specialists = [];
  List<String> _specialties = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        _api.get('/specialists', auth: false),
        _api.get('/specialists/specialties', auth: false),
      ]);
      if (!mounted) return;
      setState(() {
        _specialists = (results[0]['data'] as List?) ?? [];
        _specialties = (results[1]['data'] as List?)?.cast<String>() ?? [];
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  List<dynamic> get _filtered {
    return _specialists.where((s) {
      final matchQuery = _query.isEmpty ||
          (s['name'] as String? ?? '').toLowerCase().contains(_query.toLowerCase()) ||
          (s['specialty'] as String? ?? '').toLowerCase().contains(_query.toLowerCase()) ||
          (s['district'] as String? ?? '').toLowerCase().contains(_query.toLowerCase());
      final matchFilter = _filter == 'Tous' || s['specialty'] == _filter;
      return matchQuery && matchFilter;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final chips = ['Tous', ..._specialties];

    return FeatureScaffold(
      title: 'Annuaire spécialistes',
      subtitle: 'Orientation santé · Partenaires PharmaVie',
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 0),
            child: TextField(
              decoration: const InputDecoration(
                hintText: 'Rechercher un praticien ou quartier…',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: chips.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final s = chips[i];
                final selected = _filter == s;
                return FilterChip(
                  label: Text(s),
                  selected: selected,
                  onSelected: (_) => setState(() => _filter = s),
                  selectedColor: AppColors.brand50,
                  checkmarkColor: AppColors.brand700,
                );
              },
            ),
          ),
          const SizedBox(height: 8),
          const FeatureBanner(
            icon: Icons.local_hospital_outlined,
            title: 'Annuaire partenaire',
            message: 'Spécialistes référencés pour orientation. La prise de rendez-vous in-app arrive en Phase 2.',
            color: AppColors.blue600,
          ),
          if (_loading)
            const Expanded(child: Center(child: CircularProgressIndicator()))
          else if (_error != null)
            Expanded(
              child: Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.slate500)),
                      const SizedBox(height: 12),
                      FilledButton(onPressed: _load, child: const Text('Réessayer')),
                    ],
                  ),
                ),
              ),
            )
          else
            Expanded(
              child: RefreshIndicator(
                onRefresh: _load,
                child: _filtered.isEmpty
                    ? ListView(
                        children: const [
                          SizedBox(height: 48),
                          Center(child: Text('Aucun spécialiste trouvé', style: TextStyle(color: AppColors.slate500))),
                        ],
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                        itemCount: _filtered.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (_, i) {
                          final s = _filtered[i];
                          final name = s['name'] as String? ?? '';
                          final specialty = s['specialty'] as String? ?? '';
                          final location = s['location'] as String? ?? '';
                          final district = s['district'] as String? ?? '';
                          final rating = (s['rating'] as num?)?.toStringAsFixed(1) ?? '—';
                          final phone = s['phone'] as String? ?? '';
                          final initial = name.split(' ').where((p) => p.isNotEmpty).lastOrNull;
                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                CircleAvatar(
                                  backgroundColor: AppColors.brand50,
                                  child: Text(
                                    initial != null && initial.isNotEmpty ? initial[0] : '?',
                                    style: const TextStyle(color: AppColors.brand700, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                      Text(specialty, style: const TextStyle(fontSize: 13, color: AppColors.brand700)),
                                      const SizedBox(height: 4),
                                      Text(location, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                                      Text('$district · ★ $rating', style: const TextStyle(fontSize: 12, color: AppColors.slate400)),
                                    ],
                                  ),
                                ),
                                if (phone.isNotEmpty)
                                  IconButton(
                                    onPressed: () async {
                                      final uri = Uri.parse('tel:$phone');
                                      if (await canLaunchUrl(uri)) {
                                        await launchUrl(uri);
                                      }
                                    },
                                    icon: const Icon(Icons.phone_outlined, color: AppColors.brand600),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
              ),
            ),
        ],
      ),
    );
  }
}
