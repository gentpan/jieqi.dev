declare module 'lunar-javascript' {
  interface SolarDate { toYmd():string; toYmdHms():string; getLunar():LunarDate }
  interface LunarDate { getSolar():SolarDate; getJieQiTable():Record<string,SolarDate>; getMonth():number; getDay():number }
  const lunar:{Solar:{fromYmd(year:number,month:number,day:number):SolarDate};Lunar:{fromYmd(year:number,month:number,day:number):LunarDate}};
  export default lunar;
}
