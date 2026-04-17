export type Unit = "kilometers" | "miles";

export const convertRadius = (
  radius: number,
  fromUnit: "meters" | "kilometers" | "miles",
  toUnit: "meters" | "kilometers" | "miles"
): number => {
  if (fromUnit === toUnit) return radius;

  // Converte para metros como unidade intermediária
  let radiusInMeters = radius;
  if (fromUnit === "kilometers") radiusInMeters = radius * 1000;
  if (fromUnit === "miles") radiusInMeters = radius * 1609.34;

  // Converte de metros para a unidade de destino
  if (toUnit === "kilometers") return radiusInMeters / 1000;
  if (toUnit === "miles") return radiusInMeters / 1609.34;

  return radiusInMeters; // Retorna em metros por padrão
};
