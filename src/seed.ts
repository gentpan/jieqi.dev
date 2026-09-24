import { eventSchema, scheduleSchema, settingsSchema, terms } from './schema.ts';
import type { Store } from './database.ts';
import { editorial } from './editorial.ts';

const slugs=['xiaohan','dahan','lichun','yushui','jingzhe','chunfen','qingming','guyu','lixia','xiaoman','mangzhong','xiazhi','xiaoshu','dashu','liqiu','chushu','bailu','qiufen','hanlu','shuangjiang','lidong','xiaoxue','daxue','dongzhi'];


export function seed(store:Store) {
  // Seed only an entirely empty database. Never overwrite an editor's content.
  if(store.db.prepare('SELECT 1 FROM events LIMIT 1').get() || store.publication()) return;
  store.transaction(()=>{
    terms.forEach((name,index)=>store.putEvent(eventSchema.parse({id:`term-${slugs[index]}`,name,category:'solar-term',rule:{kind:'term',name},priority:20,...editorial[`term-${slugs[index]}`]})));
    const festivals=[
      {id:'new-year',name:'元旦',rule:{kind:'solar',month:1,day:1},description:'新岁开启，愿接下来的日子有光、有暖，也有新的期待。'},
      {id:'new-years-eve',name:'除夕',rule:{kind:'lunar',month:1,day:1,dayOffset:-1},quote:'灯火可亲，家人闲坐。',description:'农历岁末的最后一夜，年夜饭、守岁与辞旧迎新，把一家人的牵挂聚在灯火之下。',priority:85},
      {id:'spring-festival',name:'春节',rule:{kind:'lunar',month:1,day:1},quote:'灯火映团圆，新岁启好景。',description:'春节是农历新年的开始。贴春联、拜年、团圆饭，寄托着辞旧迎新与阖家团圆的心愿。',image:'/assets/spring-festival-v1.png',accent:'#b64a32',priority:90},
      {id:'lantern-festival',name:'元宵节',rule:{kind:'lunar',month:1,day:15},description:'正月十五，赏花灯、猜灯谜，汤圆与元宵盛着团圆的祝愿。'},
      {id:'womens-day',name:'妇女节',rule:{kind:'solar',month:3,day:8},quote:'愿每一种选择，都自在而有光。',description:'三月八日，致意女性的创造、勇气与贡献。尊重每一种选择，让平等与关怀落在日常。'},
      {id:'qingming-festival',name:'清明节',rule:{kind:'term',name:'清明'},description:'清明兼有节气与节日的意义。人们祭扫追思，也在春光中踏青。'},
      {id:'labour-day',name:'五一',rule:{kind:'solar',month:5,day:1},quote:'认真耕耘，也好好休息。',description:'五一劳动节，向每一份认真付出致意。让忙碌暂歇，把时间留给生活与身边的人。',image:'/assets/labour-day-v1.png',accent:'#a4533c',priority:80},
      {id:'youth-day',name:'青年节',rule:{kind:'solar',month:5,day:4},quote:'心怀热望，步履不停。',description:'五四青年节，致意蓬勃的理想与勇敢的行动。把好奇留在心里，把可能写进明天。'},
      {id:'childrens-day',name:'儿童节',rule:{kind:'solar',month:6,day:1},quote:'把快乐装进口袋，把好奇留给世界。',description:'六一儿童节，愿孩子们在关爱中自在成长，也愿每个大人都保留一点童心。'},
      {id:'dragon-boat',name:'端午节',rule:{kind:'lunar',month:5,day:5},description:'五月初五，粽叶飘香。包粽子、赛龙舟、悬艾草，是各地常见的端午习俗。'},
      {id:'qixi',name:'七夕',rule:{kind:'lunar',month:7,day:7},description:'七夕承载着乞巧的传统，也寄托着人们对美好相逢的期待。'},
      {id:'mid-autumn',name:'中秋节',rule:{kind:'lunar',month:8,day:15},description:'八月十五，望月思亲。月饼与团聚，把远近的牵挂连在一起。'},
      {id:'teachers-day',name:'教师节',rule:{kind:'solar',month:9,day:10},quote:'一盏灯，照亮许多个明天。',description:'九月十日，向每一位耐心引路的老师说声谢谢。知识与关怀，在一代代人的成长中延续。'},
      {id:'national-day',name:'国庆节',rule:{kind:'solar',month:10,day:1},description:'十月开启，秋光正好。记录旅途风景，也珍惜与亲友相聚的时光。'},
      {id:'double-ninth',name:'重阳节',rule:{kind:'lunar',month:9,day:9},description:'九月初九，登高赏菊，也把陪伴和问候送给长辈。'},
      {id:'laba',name:'腊八',rule:{kind:'lunar',month:12,day:8},quote:'一碗热粥，慢慢把年煮近。',description:'腊月初八，许多地方有喝腊八粥的习俗。谷物与豆子的香气，带来岁末的暖意。'},
    ];
    festivals.forEach(e=>store.putEvent(eventSchema.parse({...e,category:'festival',...editorial[e.id]})));
    store.putSchedule(scheduleSchema.parse({year:2026,status:'confirmed',
      sourceUrl:'https://www.beijing.gov.cn/cs/gncs/zcwj/202603/t20260327_4568275.html',
      sourceTitle:'国务院办公厅关于2026年部分节假日安排的通知（国办发明电〔2025〕7号）',
      holidays:[
        {id:'new-year-2026',eventId:'new-year',name:'元旦假期',start:'2026-01-01',end:'2026-01-03',workdays:['2026-01-04']},
        {id:'spring-festival-2026',eventId:'spring-festival',name:'春节假期',start:'2026-02-15',end:'2026-02-23',workdays:['2026-02-14','2026-02-28']},
        {id:'qingming-2026',eventId:'qingming-festival',name:'清明假期',start:'2026-04-04',end:'2026-04-06',workdays:[]},
        {id:'labour-day-2026',eventId:'labour-day',name:'五一假期',start:'2026-05-01',end:'2026-05-05',workdays:['2026-05-09']},
        {id:'dragon-boat-2026',eventId:'dragon-boat',name:'端午假期',start:'2026-06-19',end:'2026-06-21',workdays:[]},
        {id:'mid-autumn-2026',eventId:'mid-autumn',name:'中秋假期',start:'2026-09-25',end:'2026-09-27',workdays:[]},
        {id:'national-day-2026',eventId:'national-day',name:'国庆假期',start:'2026-10-01',end:'2026-10-07',workdays:['2026-09-20','2026-10-10']},
      ]}));
    store.putSettings(settingsSchema.parse({}));
  });
}
