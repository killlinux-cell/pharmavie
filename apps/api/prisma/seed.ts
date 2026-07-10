import {
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import { hashPassword } from '../src/auth/password.util';
import { MEDICAMENTS_CI } from './data/medicaments-ci';

const prisma = new PrismaClient();
const DEFAULT_STAFF_PASSWORD = 'PharmaVie2026!';

function randomQty(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const pharmacies = await Promise.all([
    prisma.pharmacy.upsert({
      where: { slug: 'pharmacie-du-plateau' },
      update: {},
      create: {
        name: 'Pharmacie du Plateau',
        slug: 'pharmacie-du-plateau',
        phone: '+2250700000001',
        street: 'Boulevard de la République, Plateau',
        city: 'Abidjan',
        district: 'Plateau',
        latitude: 5.3197,
        longitude: -4.0268,
        isOnDuty: true,
        openTime: '08:00',
        closeTime: '22:00',
        licenseNo: 'PH-CI-001',
      },
    }),
    prisma.pharmacy.upsert({
      where: { slug: 'pharmacie-cocody-riviera' },
      update: {},
      create: {
        name: 'Pharmacie Cocody Riviera',
        slug: 'pharmacie-cocody-riviera',
        phone: '+2250700000011',
        street: 'Boulevard Latrille, Cocody',
        city: 'Abidjan',
        district: 'Cocody',
        latitude: 5.3599,
        longitude: -3.9873,
        isOnDuty: false,
        openTime: '07:30',
        closeTime: '21:00',
        licenseNo: 'PH-CI-002',
      },
    }),
    prisma.pharmacy.upsert({
      where: { slug: 'pharmacie-marcory' },
      update: {},
      create: {
        name: 'Pharmacie Marcory Zone 4',
        slug: 'pharmacie-marcory',
        phone: '+2250700000012',
        street: 'Rue du Canal, Marcory',
        city: 'Abidjan',
        district: 'Marcory',
        latitude: 5.3012,
        longitude: -3.9821,
        isOnDuty: true,
        openTime: '08:00',
        closeTime: '20:00',
        licenseNo: 'PH-CI-003',
      },
    }),
  ]);

  const pharmacy = pharmacies[0];
  const products = [];

  for (const med of MEDICAMENTS_CI) {
    const product = med.airpAuth && med.airpAuth !== 'LNME'
      ? await prisma.product.upsert({
          where: { airpAuth: med.airpAuth },
          update: { name: med.name, dci: med.dci, category: med.category, requiresRx: med.requiresRx },
          create: {
            name: med.name,
            dci: med.dci,
            category: med.category,
            barcode: med.barcode,
            requiresRx: med.requiresRx,
            airpAuth: med.airpAuth,
            description: `Réf. AIRP/LNME: ${med.airpAuth}`,
          },
        })
      : await prisma.product.upsert({
          where: { barcode: med.barcode },
          update: {
            name: med.name,
            dci: med.dci,
            category: med.category,
            requiresRx: med.requiresRx,
          },
          create: {
            name: med.name,
            dci: med.dci,
            category: med.category,
            barcode: med.barcode,
            requiresRx: med.requiresRx,
            airpAuth: med.airpAuth === 'LNME' ? undefined : med.airpAuth,
            description: med.airpAuth ? `Réf. AIRP/LNME: ${med.airpAuth}` : undefined,
          },
        });
    products.push({ product, med });
  }

  for (const { product, med } of products) {
    for (const ph of pharmacies) {
      const stockFactor = ph.slug === 'pharmacie-du-plateau' ? 1 : ph.slug === 'pharmacie-cocody-riviera' ? 0.85 : 0.7;
      const qty = Math.max(5, Math.round(randomQty(20, 150) * stockFactor));
      const priceVariation = ph.slug === 'pharmacie-marcory' ? 0.95 : ph.slug === 'pharmacie-cocody-riviera' ? 1.05 : 1;
      await prisma.pharmacyProduct.upsert({
        where: {
          pharmacyId_productId: { pharmacyId: ph.id, productId: product.id },
        },
        update: {
          price: Math.round(med.priceFcfa * priceVariation),
          quantity: qty,
          isAvailable: qty > 0,
        },
        create: {
          pharmacyId: ph.id,
          productId: product.id,
          price: Math.round(med.priceFcfa * priceVariation),
          quantity: qty,
          isAvailable: true,
        },
      });
    }
  }

  const staffPasswordHash = await hashPassword(DEFAULT_STAFF_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { phone: '+2250700000099' },
    update: {
      email: 'admin@pharmavie.space',
      username: 'admin',
      passwordHash: staffPasswordHash,
      role: UserRole.ADMIN,
    },
    create: {
      phone: '+2250700000099',
      email: 'admin@pharmavie.space',
      username: 'admin',
      passwordHash: staffPasswordHash,
      firstName: 'Admin',
      lastName: 'PharmaVie',
      role: UserRole.ADMIN,
    },
  });

  const pharmacist = await prisma.user.upsert({
    where: { phone: '+2250700000002' },
    update: {
      role: UserRole.PHARMACIST,
      firstName: 'Kouamé',
      lastName: 'Pharmacien',
      email: 'plateau@pharmavie.space',
      username: 'pharmacie-plateau',
      passwordHash: staffPasswordHash,
    },
    create: {
      phone: '+2250700000002',
      email: 'plateau@pharmavie.space',
      username: 'pharmacie-plateau',
      passwordHash: staffPasswordHash,
      firstName: 'Kouamé',
      lastName: 'Pharmacien',
      role: UserRole.PHARMACIST,
    },
  });

  await prisma.pharmacyStaff.upsert({
    where: { userId_pharmacyId: { userId: pharmacist.id, pharmacyId: pharmacy.id } },
    update: {},
    create: { userId: pharmacist.id, pharmacyId: pharmacy.id, role: UserRole.PHARMACIST },
  });

  const pharmacistCocody = await prisma.user.upsert({
    where: { phone: '+2250700000022' },
    update: {
      role: UserRole.PHARMACIST,
      firstName: 'Aminata',
      lastName: 'Cocody',
      email: 'cocody@pharmavie.space',
      username: 'pharmacie-cocody',
      passwordHash: staffPasswordHash,
    },
    create: {
      phone: '+2250700000022',
      email: 'cocody@pharmavie.space',
      username: 'pharmacie-cocody',
      passwordHash: staffPasswordHash,
      firstName: 'Aminata',
      lastName: 'Cocody',
      role: UserRole.PHARMACIST,
    },
  });

  await prisma.pharmacyStaff.upsert({
    where: { userId_pharmacyId: { userId: pharmacistCocody.id, pharmacyId: pharmacies[1].id } },
    update: {},
    create: { userId: pharmacistCocody.id, pharmacyId: pharmacies[1].id, role: UserRole.PHARMACIST },
  });

  const pharmacistMarcory = await prisma.user.upsert({
    where: { phone: '+2250700000023' },
    update: {
      role: UserRole.PHARMACIST,
      firstName: 'Jean',
      lastName: 'Marcory',
      email: 'marcory@pharmavie.space',
      username: 'pharmacie-marcory',
      passwordHash: staffPasswordHash,
    },
    create: {
      phone: '+2250700000023',
      email: 'marcory@pharmavie.space',
      username: 'pharmacie-marcory',
      passwordHash: staffPasswordHash,
      firstName: 'Jean',
      lastName: 'Marcory',
      role: UserRole.PHARMACIST,
    },
  });

  await prisma.pharmacyStaff.upsert({
    where: { userId_pharmacyId: { userId: pharmacistMarcory.id, pharmacyId: pharmacies[2].id } },
    update: {},
    create: { userId: pharmacistMarcory.id, pharmacyId: pharmacies[2].id, role: UserRole.PHARMACIST },
  });

  const client = await prisma.user.upsert({
    where: { phone: '+2250700000003' },
    update: {},
    create: {
      phone: '+2250700000003',
      firstName: 'Awa',
      lastName: 'Koné',
      role: UserRole.CLIENT,
    },
  });

  const p0 = products[0].product;
  const p1 = products[5].product;

  const order1 = await prisma.order.upsert({
    where: { orderNumber: 'PV-20260702-0001' },
    update: {},
    create: {
      orderNumber: 'PV-20260702-0001',
      userId: client.id,
      pharmacyId: pharmacy.id,
      status: OrderStatus.PREPARING,
      type: OrderType.PICKUP,
      subtotal: 1800,
      deliveryFee: 0,
      total: 1800,
      items: {
        create: [
          { productId: p0.id, quantity: 2, unitPrice: 500, total: 1000 },
          { productId: p1.id, quantity: 1, unitPrice: 800, total: 800 },
        ],
      },
    },
  });

  const order2 = await prisma.order.upsert({
    where: { orderNumber: 'PV-20260702-0002' },
    update: {},
    create: {
      orderNumber: 'PV-20260702-0002',
      userId: client.id,
      pharmacyId: pharmacy.id,
      status: OrderStatus.NEW,
      type: OrderType.DELIVERY,
      subtotal: 500,
      deliveryFee: 1500,
      total: 2000,
      deliveryAddress: 'Cocody, Abidjan',
      items: {
        create: [{ productId: p0.id, quantity: 1, unitPrice: 500, total: 500 }],
      },
    },
  });

  await prisma.payment.upsert({
    where: { orderId: order1.id },
    update: {},
    create: {
      orderId: order1.id,
      method: PaymentMethod.ORANGE_MONEY,
      status: PaymentStatus.SUCCESS,
      amount: order1.total,
      phone: client.phone,
      transactionId: 'PV-SEED-001',
    },
  });

  console.log('Seed terminé :');
  console.log(`- ${pharmacies.length} pharmacies`);
  console.log(`- ${products.length} médicaments CI (AIRP/LNME)`);
  console.log(`- Admin web: admin@pharmavie.space / mot de passe: ${DEFAULT_STAFF_PASSWORD}`);
  console.log(`- Pharmacie Plateau: pharmacie-plateau / ${DEFAULT_STAFF_PASSWORD}`);
  console.log(`- Pharmacie Cocody: pharmacie-cocody / ${DEFAULT_STAFF_PASSWORD}`);
  console.log(`- Pharmacie Marcory: pharmacie-marcory / ${DEFAULT_STAFF_PASSWORD}`);
  console.log(`- Client mobile OTP: ${client.phone}`);
  console.log(`- 2 commandes exemple`);

  const specialistsSeed = [
    {
      name: 'Dr. Aya Koné',
      specialty: 'Médecine générale',
      location: 'Clinique Plateau Santé',
      district: 'Plateau',
      rating: 4.8,
      phone: '+2252720000001',
    },
    {
      name: 'Dr. Ibrahim Touré',
      specialty: 'Pédiatrie',
      location: 'Centre Médical Cocody',
      district: 'Cocody',
      rating: 4.9,
      phone: '+2252722000002',
    },
    {
      name: 'Dr. Fatou Bamba',
      specialty: 'Gynécologie',
      location: 'Polyclinique Marcory',
      district: 'Marcory',
      rating: 4.7,
      phone: '+2252721000003',
    },
    {
      name: 'Dr. Yao N\'Guessan',
      specialty: 'Cardiologie',
      location: 'Hôpital Universitaire',
      district: 'Yopougon',
      rating: 4.6,
      phone: '+2252723000004',
    },
    {
      name: 'Dr. Mariam Diallo',
      specialty: 'Dermatologie',
      location: 'Cabinet Riviera',
      district: 'Riviera',
      rating: 4.8,
      phone: '+2252722000005',
    },
  ];

  for (const s of specialistsSeed) {
    await prisma.specialist.upsert({
      where: { phone: s.phone },
      update: {},
      create: s,
    });
  }

  console.log(`- ${specialistsSeed.length} spécialistes annuaire`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
