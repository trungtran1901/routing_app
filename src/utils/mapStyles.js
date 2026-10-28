const off = [{ visibility: 'off' }]

export const MAP_FEATURE_GROUPS = [
  {
    key: 'poi',
    label: 'Địa điểm & biểu tượng',
    icon: 'place',
    styles: [{ featureType: 'poi', elementType: 'labels', stylers: off }]
  },
  {
    key: 'roadNames',
    label: 'Tên đường',
    icon: 'text_fields',
    styles: [{ featureType: 'road', elementType: 'labels.text', stylers: off }]
  },
  {
    key: 'roadIcons',
    label: 'Số hiệu đường',
    icon: 'looks_one',
    styles: [{ featureType: 'road', elementType: 'labels.icon', stylers: off }]
  },
  {
    key: 'transit',
    label: 'Giao thông công cộng',
    icon: 'directions_bus',
    styles: [{ featureType: 'transit', elementType: 'labels', stylers: off }]
  },
  {
    key: 'admin',
    label: 'Ranh giới hành chính',
    icon: 'domain',
    styles: [{ featureType: 'administrative', elementType: 'labels', stylers: off }]
  },
  {
    key: 'landscape',
    label: 'Khu vực & địa hình',
    icon: 'terrain',
    styles: [{ featureType: 'landscape', elementType: 'labels', stylers: off }]
  },
  {
    key: 'water',
    label: 'Sông hồ',
    icon: 'waves',
    styles: [{ featureType: 'water', elementType: 'labels', stylers: off }]
  },
  {
    key: 'allLabels',
    label: 'Toàn bộ nhãn',
    icon: 'label',
    styles: [{ featureType: 'all', elementType: 'labels', stylers: off }]
  }
]

export function buildMapStyles(visibility) {
  return MAP_FEATURE_GROUPS
    .filter(group => visibility[group.key] === false)
    .flatMap(group => group.styles)
}