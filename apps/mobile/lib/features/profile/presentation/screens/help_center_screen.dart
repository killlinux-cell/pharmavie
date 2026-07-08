import 'package:flutter/material.dart';
import 'package:pharmavie_mobile/core/theme/app_theme.dart';
import 'package:pharmavie_mobile/core/widgets/feature_scaffold.dart';

class HelpCenterScreen extends StatelessWidget {
  const HelpCenterScreen({super.key});

  static const _faqs = [
    ('Comment commander un médicament ?', 'Recherchez sur l\'accueil, choisissez une pharmacie et validez le checkout avec Mobile Money.'),
    ('Comment suivre ma commande ?', 'Onglet Commandes : statut en temps réel et timeline de progression.'),
    ('Puis-je payer en espèces ?', 'Oui, option CASH disponible au checkout pour retrait en pharmacie.'),
    ('L\'assistant IA remplace-t-il un médecin ?', 'Non. Il oriente et informe — consultez un professionnel pour tout diagnostic.'),
  ];

  @override
  Widget build(BuildContext context) {
    return FeatureScaffold(
      title: 'Centre d\'aide',
      subtitle: 'FAQ et assistance',
      badge: 'Support',
      child: ListView(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
        children: [
          ..._faqs.map((faq) {
            final (q, a) = faq;
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.border),
              ),
              child: ExpansionTile(
                title: Text(q, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Text(a, style: const TextStyle(color: AppColors.slate600, height: 1.4)),
                  ),
                ],
              ),
            );
          }),
          const SizedBox(height: 16),
          const FeatureBanner(
            icon: Icons.support_agent,
            title: 'Besoin d\'aide ?',
            message: 'Contactez-nous au +225 07 00 00 00 00 ou par email support@pharmavie.ci',
          ),
        ],
      ),
    );
  }
}
