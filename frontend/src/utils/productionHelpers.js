// ============================================================================
// 🎯 PRODUCTION HELPER FUNCTIONS
// ============================================================================

export const generateProductionJobs = (complexData) => {
  if (!complexData || !complexData.variants || complexData.variants.length === 0) return [];
  let jobs = [];
  
  complexData.variants.forEach((variant, idx) => {
    jobs.push({
      id: `job_${Date.now()}_${idx}_f`,
      name: `${variant.name} - ÖN`,
      quantity: variant.quantity,
      type: 'Front',
      variantName: variant.name,
      status: 'pending_mounting'
    });

    if (complexData.isSet && !complexData.commonBack) {
      jobs.push({
        id: `job_${Date.now()}_${idx}_b`,
        name: `${variant.name} - ARKA`,
        quantity: variant.quantity,
        type: 'Back',
        variantName: variant.name,
        status: 'pending_mounting'
      });
    }
  });

  if (complexData.isSet && complexData.commonBack) {
    const totalQty = complexData.variants.reduce((sum, v) => sum + parseInt(v.quantity || 0), 0);
    jobs.push({
      id: `job_${Date.now()}_common_b`,
      name: `ORTAK ARKA ETİKET`,
      quantity: totalQty,
      type: 'Back_Common',
      variantName: 'All',
      status: 'pending_mounting'
    });
  }
  return jobs;
};

export const calculatePlateMeterage = (plate) => {
  if (!plate.zStep || !plate.items.length) return 0;
  
  const ZET_MULTIPLIER = 3.175;
  
  // Tüm işlerin toplam adetini hesapla
  let totalQuantity = 0;
  // Tüm işlerin toplam kaçlı (kombine/yanyana) sayısını hesapla
  let totalLanes = 0;
  
  plate.items.forEach(item => {
    const jobQty = parseInt(item.job.quantity) || 0;
    const lanes = parseInt(item.lanes) || 1;
    totalQuantity += jobQty;
    totalLanes += lanes;
  });
  
  // Akış/Tekrar (Alt Alta) değeri - varsayılan 1
  const akisTekrar = parseFloat(plate.akisTekrar) || 1;
  
  // ZET değeri (Z-Step olarak girilmiş olabilir)
  const zet = parseFloat(plate.zStep) || 0;
  
  if (totalLanes > 0 && totalQuantity > 0 && zet > 0) {
    // Adımlama = (ZET × 3.175) / Akış/Tekrar
    const adimLama = (zet * ZET_MULTIPLIER) / akisTekrar;
    
    // Metraj = Adımlama × Toplam Adet / Kombine (Yanyana Kaçlı) / 1000
    const metersRequired = (adimLama * totalQuantity) / totalLanes / 1000;
    return Math.ceil(metersRequired);
  }
  
  return 0;
};
