import React from 'react';
import { 
  Palette, Archive, Package, Calendar, CheckCircle, Printer, 
  Truck, Check, AlertCircle 
} from 'lucide-react';

// ============================================================================
// 📊 STATUS BADGE COMPONENT
// ============================================================================

export default function StatusBadge({ status }) {
  const statusMap = {
    graphics_pending: { text: "Grafik Bekliyor", color: "bg-blue-500", icon: Palette },
    warehouse_raw_pending: { text: "Hammadde Onayı", color: "bg-indigo-500", icon: Archive },
    warehouse_processing: { text: "Depo İşlemde", color: "bg-purple-500", icon: Package },
    planning_pending: { text: "Planlama Bekliyor", color: "bg-orange-500", icon: Calendar },
    planned: { text: "Planlandı", color: "bg-green-500", icon: CheckCircle },
    production_started: { text: "Üretimde", color: "bg-teal-500", icon: Printer },
    shipping_ready: { text: "Sevk Bekliyor", color: "bg-yellow-500", icon: Truck },
    completed: { text: "Tamamlandı", color: "bg-gray-800", icon: Check }
  };
  
  const s = statusMap[status] || { text: status, color: "bg-gray-400", icon: AlertCircle };
  const Icon = s.icon;
  
  return (
    <span className={`${s.color} text-white px-3 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-sm`}>
      <Icon size={14} />
      {s.text}
    </span>
  );
}
