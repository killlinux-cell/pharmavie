import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/api/api_client.dart';
import 'package:pharmavie_mobile/core/services/local_prefs_service.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';

class NotificationsPreviewScreen extends StatefulWidget {
  const NotificationsPreviewScreen({super.key});

  @override
  State<NotificationsPreviewScreen> createState() => _NotificationsPreviewScreenState();
}

class _NotificationsPreviewScreenState extends State<NotificationsPreviewScreen> {
  final _api = ApiClient();
  Map<String, bool> _prefs = {};
  bool _loading = true;

  static const _labels = {
    'orderStatus': ('Statut de commande', 'Alertes à chaque étape : confirmée, prête, livrée…'),
    'promotions': ('Promotions pharmacies', 'Offres et réductions près de chez vous'),
    'reminders': ('Rappels médicaments', 'Renouvellement traitement et prises'),
    'pharmacyNews': ('Actualités santé', 'Conseils et campagnes PharmaVie'),
  };

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final token = await _api.getToken();
    if (token != null) {
      try {
        final res = await _api.get('/users/me/notification-preferences');
        final data = res['data'] as Map<String, dynamic>;
        setState(() {
          _prefs = {
            'orderStatus': data['orderStatus'] == true,
            'promotions': data['promotions'] == true,
            'reminders': data['reminders'] == true,
            'pharmacyNews': data['pharmacyNews'] == true,
          };
          _loading = false;
        });
        return;
      } on ApiException {
        // fallback local
      }
    }
    final prefs = await LocalPrefsService.instance.getNotificationPrefs();
    setState(() {
      _prefs = prefs;
      _loading = false;
    });
  }

  Future<void> _toggle(String key, bool value) async {
    final apiKey = key;
    final token = await _api.getToken();
    if (token != null) {
      try {
        await _api.patch('/users/me/notification-preferences', {apiKey: value});
        setState(() => _prefs[key] = value);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Préférence enregistrée sur votre compte')),
          );
        }
        return;
      } on ApiException {
        // fallback
      }
    }
    await LocalPrefsService.instance.setNotificationPref(key, value);
    setState(() => _prefs[key] = value);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Préférence enregistrée localement — push Firebase à venir')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Notifications push',
      subtitle: 'Configurez vos alertes (synchronisées avec votre compte)',
      child: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
              children: [
                const FeatureBanner(
                  icon: Icons.notifications_active_outlined,
                  title: 'Push notifications en préparation',
                  message: 'Vos préférences sont sauvegardées sur votre compte. L\'envoi push via Firebase Cloud Messaging sera activé prochainement.',
                ),
                ..._labels.entries.map((entry) {
                  final key = entry.key;
                  final (title, subtitle) = entry.value;
                  return _NotifTile(
                    title: title,
                    subtitle: subtitle,
                    value: _prefs[key] ?? false,
                    onChanged: (v) => _toggle(key, v),
                  );
                }),
                const SizedBox(height: 16),
                const Text('Exemples de notifications', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const SizedBox(height: 12),
                _PreviewNotif(
                  icon: Icons.check_circle_outline,
                  title: 'Commande confirmée',
                  body: 'Pharmacie du Plateau a accepté votre commande #PV-001',
                  time: 'Il y a 2 min',
                  color: AppColors.brand600,
                ),
                _PreviewNotif(
                  icon: Icons.local_shipping_outlined,
                  title: 'En livraison',
                  body: 'Votre commande arrive dans ~25 minutes',
                  time: 'Hier',
                  color: AppColors.blue600,
                ),
              ],
            ),
    );
  }
}

class _NotifTile extends StatelessWidget {
  const _NotifTile({required this.title, required this.subtitle, required this.value, required this.onChanged});

  final String title;
  final String subtitle;
  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: SwitchListTile(
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
        subtitle: Text(subtitle, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
        value: value,
        activeTrackColor: AppColors.brand600.withValues(alpha: 0.4),
        thumbColor: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) return AppColors.brand600;
          return null;
        }),
        onChanged: onChanged,
      ),
    );
  }
}

class _PreviewNotif extends StatelessWidget {
  const _PreviewNotif({required this.icon, required this.title, required this.body, required this.time, required this.color});

  final IconData icon;
  final String title;
  final String body;
  final String time;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(child: Text(title, style: const TextStyle(fontWeight: FontWeight.w600))),
                    Text(time, style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(body, style: const TextStyle(fontSize: 13, color: AppColors.slate600)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
