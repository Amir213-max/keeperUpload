import { graphqlClient } from "./graphqlClient";

export async function getCurrencyRate() {
  console.log("🔄 getCurrencyRate: Starting API call...");
  
  const query = `
    query {
      publicSettings {
        key
        value
      }
    }
  `;

  try {
    console.log("🔄 getCurrencyRate: Making GraphQL request...");
    const res = await graphqlClient.request(query);
    console.log("✅ getCurrencyRate: API Response received:", res);

    const eurToSarSetting = res?.publicSettings?.find(
      (setting) => setting.key === "eur_to_sar"
    );

    console.log("🔍 getCurrencyRate: Looking for eur_to_sar setting...");
    console.log("🔍 getCurrencyRate: Found setting:", eurToSarSetting);

    if (!eurToSarSetting) {
      console.error("❌ getCurrencyRate: eur_to_sar setting not found in publicSettings");
      console.log("📋 getCurrencyRate: Available settings:", res?.publicSettings?.map(s => s.key));
      throw new Error("eur_to_sar setting not found in publicSettings");
    }

    const rate = parseFloat(eurToSarSetting.value);
    console.log("✅ getCurrencyRate: Successfully parsed rate:", rate);
    
    if (isNaN(rate)) {
      console.error("❌ getCurrencyRate: Invalid rate value:", eurToSarSetting.value);
      throw new Error("Invalid currency rate value");
    }

    return rate;
  } catch (error) {
    console.error("❌ getCurrencyRate: Error occurred:", error);
    throw error;
  }
}
