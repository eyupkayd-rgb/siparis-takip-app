import { collection, addDoc, getDocs } from "firebase/firestore";

// ============================================================================
// 🎯 STOK YÖNETİMİ VE BARKOD HELPER FONKSIYONLARI
// ============================================================================

// Hammadde adından kısa kod üret (Örn: "KUŞE BEYAZ" -> "KUS")
export function getMaterialShortCode(materialName) {
  if (!materialName) return 'MAT';
  const words = materialName.toUpperCase().split(' ');
  if (words.length >= 2) {
    return words[0].substring(0, 3);
  }
  return materialName.substring(0, 3).toUpperCase();
}

// Stok hareketi kaydet
export async function logStockMovement(db, appId, movementData) {
  try {
    const movementsCollection = collection(db, 'artifacts', appId, 'public', 'data', 'stock_movements');
    await addDoc(movementsCollection, {
      ...movementData,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stok hareketi kayıt hatası:', error);
  }
}

// Otomatik barkod oluştur: PREFIX-MATCODE-XXXX
export async function generateBarcode(materialName, supplierPrefix, db, appId) {
  try {
    const materialCode = getMaterialShortCode(materialName);
    const prefix = `${supplierPrefix || 'XX'}-${materialCode}`;
    
    // Son barkodu bul
    const rollsRef = collection(db, 'artifacts', appId, 'public', 'data', 'stock_rolls');
    const snapshot = await getDocs(rollsRef);
    
    let maxNumber = 0;
    snapshot.forEach(doc => {
      const barcode = doc.data().rollBarcode || '';
      if (barcode.startsWith(prefix)) {
        const parts = barcode.split('-');
        const num = parseInt(parts[parts.length - 1]);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });
    
    const nextNumber = (maxNumber + 1).toString().padStart(4, '0');
    return `${prefix}-${nextNumber}`;
  } catch (error) {
    console.error('Barkod oluşturma hatası:', error);
    return `${supplierPrefix || 'XX'}-${getMaterialShortCode(materialName)}-0001`;
  }
}
