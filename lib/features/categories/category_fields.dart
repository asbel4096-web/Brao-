import 'package:flutter/material.dart';

import 'category.dart';

/// ============================================================
///  نظام الحقول الديناميكي لكل قسم — مطابق تمامًا لـ lib/category-config.ts
///  في الموقع (نفس المفاتيح والأنواع) لضمان توافق Firestore بين التطبيق والموقع.
///
///  كل حقل `key` يطابق حقل Listing المخزَّن في Firestore، فلا يتغيّر التخزين.
/// ============================================================

/// أنواع حقول الإدخال المدعومة في النموذج الديناميكي.
enum FieldType {
  text,
  number,
  price,
  textarea,
  select,
  city,
  brand,
  model,
  year,
  phone,
  toggle,
  rating,
  chips,
}

@immutable
class FieldDef {
  const FieldDef({
    required this.key,
    required this.label,
    required this.type,
    this.required = false,
    this.placeholder,
    this.options = const <String>[],
    this.hint,
  });

  /// المفتاح المخزَّن في Firestore (يطابق حقل Listing والموقع).
  final String key;
  final String label;
  final FieldType type;
  final bool required;
  final String? placeholder;
  final List<String> options;
  final String? hint;
}

/// نوع الكيان المخزَّن (يطابق entityType في الموقع).
enum EntityType { listing, service }

@immutable
class CategoryFieldConfig {
  const CategoryFieldConfig({
    required this.slug,
    required this.fields,
    required this.entityType,
  });
  final String slug;
  final List<FieldDef> fields;
  final EntityType entityType;
}

// ---------- حقول قابلة لإعادة الاستخدام (مطابقة لـ F في الموقع) ----------
class _F {
  static const price = FieldDef(
      key: 'price',
      label: 'السعر',
      type: FieldType.price,
      required: true,
      placeholder: 'أدخل السعر');
  static const city =
      FieldDef(key: 'city', label: 'المدينة', type: FieldType.city, required: true);
  static const phone = FieldDef(
      key: 'phone',
      label: 'رقم التواصل',
      type: FieldType.phone,
      required: true,
      placeholder: '091xxxxxxx');
  static const title = FieldDef(
      key: 'title',
      label: 'عنوان الإعلان',
      type: FieldType.text,
      required: true,
      placeholder: 'اكتب عنوانًا واضحًا');
  static const description = FieldDef(
      key: 'description',
      label: 'الوصف',
      type: FieldType.textarea,
      required: true,
      placeholder: 'اكتب وصفًا تفصيليًا');
  static const brand =
      FieldDef(key: 'brand', label: 'الماركة', type: FieldType.brand);
  static const model =
      FieldDef(key: 'model', label: 'الموديل', type: FieldType.model);
  static const year =
      FieldDef(key: 'year', label: 'سنة الصنع', type: FieldType.year);
  static const condition = FieldDef(
      key: 'condition',
      label: 'الحالة',
      type: FieldType.select,
      options: ['جديد', 'مستعمل'],
      required: true);
  static const availableNow = FieldDef(
      key: 'availableNow', label: 'متاح الآن', type: FieldType.toggle);
  static const coverageAreas = FieldDef(
      key: 'coverageAreas',
      label: 'مناطق التغطية',
      type: FieldType.text,
      placeholder: 'المناطق التي تغطيها الخدمة');
}

const _vehicleFields = <FieldDef>[
  _F.title,
  _F.brand,
  _F.model,
  _F.year,
  FieldDef(key: 'engine', label: 'المحرك', type: FieldType.text, placeholder: 'مثال: 1.6'),
  FieldDef(
      key: 'transmission',
      label: 'ناقل الحركة',
      type: FieldType.select,
      options: ['أوتوماتيك', 'عادي']),
  FieldDef(
      key: 'fuel',
      label: 'نوع الوقود',
      type: FieldType.select,
      options: ['بنزين', 'ديزل', 'كهرباء', 'هجين']),
  FieldDef(key: 'mileage', label: 'المسافة المقطوعة (كم)', type: FieldType.number),
  _F.price,
  _F.city,
  _F.phone,
];

const _partsFields = <FieldDef>[
  FieldDef(key: 'title', label: 'اسم القطعة', type: FieldType.text, required: true),
  _F.condition,
  FieldDef(
      key: 'compatibleCar',
      label: 'السيارة المتوافقة',
      type: FieldType.text,
      placeholder: 'مثال: تويوتا كامري 2015-2020'),
  _F.price,
  _F.city,
  _F.phone,
];

const _workshopFields = <FieldDef>[
  FieldDef(key: 'title', label: 'اسم الورشة', type: FieldType.text, required: true),
  _F.description,
  FieldDef(key: 'rating', label: 'التقييم', type: FieldType.rating),
  _F.city,
  _F.phone,
];

const _dealerFields = <FieldDef>[
  FieldDef(key: 'title', label: 'اسم المعرض', type: FieldType.text, required: true),
  _F.description,
  _F.city,
  _F.phone,
];

const _accidentFields = <FieldDef>[
  _F.title,
  _F.brand,
  _F.model,
  _F.year,
  FieldDef(
      key: 'damageType',
      label: 'نوع الضرر',
      type: FieldType.select,
      options: ['أمامي', 'خلفي', 'جانبي', 'شامل', 'غمر مياه', 'حريق']),
  FieldDef(key: 'repairable', label: 'قابلة للإصلاح', type: FieldType.toggle),
  _F.description,
  _F.price,
  _F.city,
  _F.phone,
];

const _busFields = <FieldDef>[
  _F.title,
  _F.brand,
  _F.model,
  _F.year,
  FieldDef(key: 'seats', label: 'عدد المقاعد', type: FieldType.number),
  FieldDef(key: 'engine', label: 'المحرك', type: FieldType.text, placeholder: 'مثال: 2.5'),
  FieldDef(
      key: 'fuel',
      label: 'نوع الوقود',
      type: FieldType.select,
      options: ['بنزين', 'ديزل', 'كهرباء', 'هجين']),
  FieldDef(key: 'mileage', label: 'المسافة المقطوعة (كم)', type: FieldType.number),
  _F.condition,
  _F.price,
  _F.city,
  _F.phone,
];

const _truckFields = <FieldDef>[
  _F.title,
  _F.brand,
  _F.model,
  _F.year,
  FieldDef(key: 'payload', label: 'الحمولة (طن)', type: FieldType.number),
  FieldDef(key: 'engine', label: 'المحرك', type: FieldType.text, placeholder: 'مثال: 3.0'),
  FieldDef(key: 'mileage', label: 'المسافة المقطوعة (كم)', type: FieldType.number),
  _F.condition,
  _F.price,
  _F.city,
  _F.phone,
];

const _truckPartsFields = <FieldDef>[
  FieldDef(key: 'title', label: 'اسم القطعة', type: FieldType.text, required: true),
  FieldDef(key: 'truckType', label: 'نوع الشاحنة', type: FieldType.text),
  FieldDef(
      key: 'compatibleCar',
      label: 'الموديلات المتوافقة',
      type: FieldType.text,
      placeholder: 'مثال: مرسيدس أكتروس 2010-2018'),
  _F.condition,
  _F.price,
  _F.city,
  _F.phone,
];

const _electricPartsFields = <FieldDef>[
  FieldDef(key: 'title', label: 'اسم القطعة', type: FieldType.text, required: true),
  FieldDef(key: 'voltage', label: 'الفولت', type: FieldType.text, placeholder: 'مثال: 12V'),
  _F.brand,
  _F.condition,
  _F.price,
  _F.city,
  _F.phone,
];

const _usedPartsFields = <FieldDef>[
  FieldDef(key: 'title', label: 'اسم القطعة', type: FieldType.text, required: true),
  _F.brand,
  _F.condition,
  FieldDef(key: 'usagePercent', label: 'نسبة الاستخدام (%)', type: FieldType.number),
  _F.price,
  _F.city,
  _F.phone,
];

const _accessoriesFields = <FieldDef>[
  FieldDef(key: 'title', label: 'اسم المنتج', type: FieldType.text, required: true),
  _F.brand,
  _F.description,
  _F.price,
  _F.city,
  _F.phone,
];

const _oilsFields = <FieldDef>[
  FieldDef(key: 'title', label: 'الاسم', type: FieldType.text, required: true),
  FieldDef(key: 'oilBrand', label: 'الشركة', type: FieldType.text),
  FieldDef(key: 'capacity', label: 'السعة', type: FieldType.text, placeholder: 'مثال: 4 لتر'),
  FieldDef(key: 'oilType', label: 'النوع', type: FieldType.text, placeholder: 'مثال: 5W-30'),
  _F.price,
  _F.city,
  _F.phone,
];

const _tiresFields = <FieldDef>[
  FieldDef(key: 'title', label: 'الاسم', type: FieldType.text, required: true),
  FieldDef(key: 'tireSize', label: 'المقاس', type: FieldType.text, placeholder: 'مثال: 215/60 R16'),
  _F.brand,
  _F.condition,
  FieldDef(key: 'tireCount', label: 'العدد', type: FieldType.number),
  _F.price,
  _F.city,
  _F.phone,
];

const _towDetailedFields = <FieldDef>[
  FieldDef(key: 'title', label: 'اسم الخدمة', type: FieldType.text, required: true),
  FieldDef(
      key: 'towType',
      label: 'نوع السطحة',
      type: FieldType.select,
      options: ['سطحة عادية', 'سطحة هيدروليك', 'ونش', 'سحب ثقيل']),
  _F.coverageAreas,
  FieldDef(key: 'available24h', label: 'خدمة 24 ساعة', type: FieldType.toggle),
  _F.availableNow,
  _F.price,
  _F.city,
  _F.phone,
];

const _motorcycleFields = <FieldDef>[
  _F.title,
  FieldDef(
      key: 'bikeType',
      label: 'نوع الدراجة',
      type: FieldType.select,
      options: ['رياضية', 'كروزر', 'سكوتر', 'أوف رود', 'ATV'],
      required: true),
  FieldDef(key: 'brand', label: 'الماركة', type: FieldType.text, placeholder: 'مثال: Honda / Yamaha'),
  _F.year,
  FieldDef(key: 'engine', label: 'سعة المحرك (cc)', type: FieldType.text, placeholder: 'مثال: 250'),
  FieldDef(key: 'mileage', label: 'المسافة المقطوعة (كم)', type: FieldType.number),
  _F.condition,
  _F.price,
  _F.city,
  _F.phone,
];

const _bicycleFields = <FieldDef>[
  _F.title,
  FieldDef(
      key: 'bikeType',
      label: 'نوع الدراجة',
      type: FieldType.select,
      options: ['جبلية', 'سباق', 'مدينة', 'كهربائية'],
      required: true),
  FieldDef(key: 'brand', label: 'الماركة', type: FieldType.text, placeholder: 'مثال: Giant / Trek'),
  FieldDef(key: 'frameSize', label: 'مقاس الإطار', type: FieldType.text, placeholder: 'مثال: 26" أو L'),
  _F.condition,
  _F.price,
  _F.city,
  _F.phone,
];

// ---------- الخريطة حسب slug (مطابقة لـ BY_SLUG في الموقع) ----------
const Map<String, (List<FieldDef>, EntityType)> _bySlug = {
  // مركبات
  'cars': (_vehicleFields, EntityType.listing),
  'motorcycles': (_motorcycleFields, EntityType.listing),
  'bicycles': (_bicycleFields, EntityType.listing),
  'buses': (_busFields, EntityType.listing),
  'trucks': (_truckFields, EntityType.listing),
  'accident-cars': (_accidentFields, EntityType.listing),
  // قطع غيار + كماليات + زيوت + إطارات
  'car-parts': (_partsFields, EntityType.listing),
  'truck-parts': (_truckPartsFields, EntityType.listing),
  'electric-parts': (_electricPartsFields, EntityType.listing),
  'used-parts': (_usedPartsFields, EntityType.listing),
  'accessories': (_accessoriesFields, EntityType.listing),
  'oils': (_oilsFields, EntityType.listing),
  'tires': (_tiresFields, EntityType.listing),
  // خدمات
  'tow-truck': (_towDetailedFields, EntityType.service),
  'mobile-mechanic': (_workshopFields, EntityType.service),
  'bodywork': (_workshopFields, EntityType.service),
  'workshops': (_workshopFields, EntityType.service),
  'auto-electric': (_workshopFields, EntityType.service),
  // خاص
  'vehicle-services': (_dealerFields, EntityType.listing),
};

(List<FieldDef>, EntityType) _defaultForGroup(String group) {
  switch (group) {
    case 'vehicles':
      return (_vehicleFields, EntityType.listing);
    case 'parts':
      return (_partsFields, EntityType.listing);
    case 'services':
      return (_workshopFields, EntityType.service);
    default:
      return (_dealerFields, EntityType.listing);
  }
}

/// يُرجع إعداد الحقول الكامل لقسم ما (بالـslug أو الاسم العربي).
/// يضمن دائمًا إرجاع إعداد صالح (افتراضي حسب group لو لم يُعرَّف صراحةً).
CategoryFieldConfig getCategoryConfig(String slugOrName) {
  final cat = categoryBySlug(slugOrName) ?? categoryByName(slugOrName);
  if (cat == null) {
    final d = _defaultForGroup('special');
    return CategoryFieldConfig(slug: slugOrName, fields: d.$1, entityType: d.$2);
  }
  final cfg = _bySlug[cat.slug] ?? _defaultForGroup(cat.group);
  return CategoryFieldConfig(slug: cat.slug, fields: cfg.$1, entityType: cfg.$2);
}
