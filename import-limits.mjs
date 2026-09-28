export const RECOMMENDED_PBF_BYTES=25*1024*1024;
export function pbfSizeAdvice(file){
 return file?.size>RECOMMENDED_PBF_BYTES?'Large PBF: a clipped city extract is recommended to reduce processing time and memory use. Only the current map area will be retained.':'';
}
