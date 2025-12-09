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
  let maxMeterage = 0;
  
  plate.items.forEach(item => {
    const jobQty = parseInt(item.job.quantity);
    const lanes = parseInt(item.lanes);
    if (lanes > 0) {
      const requiredMeters = (jobQty / lanes) * (parseFloat(plate.zStep) / 1000);
      if (requiredMeters > maxMeterage) maxMeterage = requiredMeters;
    }
  });
  return Math.ceil(maxMeterage);
};
