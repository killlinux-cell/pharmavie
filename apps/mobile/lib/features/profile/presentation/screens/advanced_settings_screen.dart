import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/services/local_prefs_service.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';

class AdvancedSettingsScreen extends StatefulWidget {
  const AdvancedSettingsScreen({super.key});

  @override
  State<AdvancedSettingsScreen> createState() => _AdvancedSettingsScreenState();
}

class _AdvancedSettingsScreenState extends State<AdvancedSettingsScreen> {
  bool _analytics = true;
  bool _darkMode = false;

  Future<void> _clearCache() async {
    await LocalPrefsService.instance.clearSearchHistory();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Historique de recherche effacé')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Paramètres avancés',
      subtitle: 'Confidentialité, données et préférences',
      badge: 'Compte',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          const Text('Apparence', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          _SettingsTile(
            title: 'Mode sombre',
            subtitle: 'Bientôt disponible',
            trailing: Switch(
              value: _darkMode,
              onChanged: (v) {
                setState(() => _darkMode = v);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Mode sombre — prochaine version')),
                );
              },
            ),
          ),
          const SizedBox(height: 16),
          const Text('Confidentialité', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          _SettingsTile(
            title: 'Statistiques d\'usage anonymes',
            subtitle: 'Aide à améliorer PharmaVie',
            trailing: Switch(
              value: _analytics,
              onChanged: (v) => setState(() => _analytics = v),
            ),
          ),
          const SizedBox(height: 16),
          const Text('Données locales', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          _SettingsTile(
            title: 'Effacer l\'historique de recherche',
            subtitle: 'Supprime les recherches récentes sur cet appareil',
            trailing: IconButton(
              onPressed: _clearCache,
              icon: const Icon(Icons.delete_outline, color: AppColors.red600),
            ),
          ),
          const SizedBox(height: 16),
          const FeatureBanner(
            icon: Icons.settings_outlined,
            title: 'Plus d\'options à venir',
            message: 'Langue (FR/EN), export de données personnelles et gestion du compte seront ajoutés prochainement.',
          ),
        ],
      ),
    );
  }
}

class _SettingsTile extends StatelessWidget {
  const _SettingsTile({required this.title, required this.subtitle, required this.trailing});

  final String title;
  final String subtitle;
  final Widget trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.fromLTRB(14, 8, 8, 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
                Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
              ],
            ),
          ),
          trailing,
        ],
      ),
    );
  }
}
