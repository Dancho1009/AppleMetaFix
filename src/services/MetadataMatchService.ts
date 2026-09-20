import { TrackMetadata } from "../providers/AppleMusicProvider";

export interface LocalTrackInfo {
 title:string;
 artist?:string;
 album?:string;
 durationMs?:number;
 audioLocale?:string;
}

export interface MatchScoreDetail { score:number; weight:number; reason:string; }
export interface MatchScoreDetails {
 title:MatchScoreDetail;
 artist:MatchScoreDetail;
 album:MatchScoreDetail;
 duration:MatchScoreDetail;
 audioLocale?:MatchScoreDetail;
}
export interface MatchResult { track:TrackMetadata; score:number; confidence:"high"|"medium"|"low"; scoreDetails:MatchScoreDetails; }

export class MetadataMatchService {
 match(local:LocalTrackInfo,candidates?:TrackMetadata[]|null):MatchResult|null{
  if(!candidates?.length)return null;
  const results=candidates.map(track=>{
   const scoreDetails=this.scoreDetails(local,track);
   const score=Math.round(Object.values(scoreDetails).filter(v=>v.weight>0).reduce((s,v)=>s+v.score*v.weight,0)/100);
   return {track,score,scoreDetails};
  }).sort((a,b)=>b.score-a.score);

  const result=results[0];
  return {...result,confidence:this.getConfidence(result.score,result.scoreDetails)};
 }

 private scoreDetails(local:LocalTrackInfo,track:TrackMetadata):MatchScoreDetails{
  return {
   title:{score:this.textScore(local.title,track.title,85),weight:50,reason:"标题匹配度"},
   artist:{score:this.artistScore(local.artist,track.artist),weight:30,reason:"艺术家匹配度"},
   album:{score:this.textScore(local.album??"",track.album,90),weight:15,reason:"专辑匹配度"},
   duration:{score:this.durationScore(local.durationMs,track.durationInMillis),weight:5,reason:"时长匹配度"}
  };
 }

 private durationScore(localMs?:number,remoteMs?:number){
  if(!localMs||!remoteMs)return 0;

  const diffSeconds=Math.abs(localMs-remoteMs)/1000;

  console.log("[DURATION MATCH]",{
   localMs,
   remoteMs,
   diffSeconds
  });

  if(diffSeconds<=2)return 100;
  if(diffSeconds<=5)return 90;
  if(diffSeconds<=10)return 70;
  if(diffSeconds<=30)return 30;
  return 0;
 }

 private artistScore(a?:string,b?:string){
  if(!a||!b)return 0;
  const left=this.normalizeArtist(a);const right=this.normalizeArtist(b);
  if(left===right)return 100;
  if(right.includes(left)||left.includes(right))return 90;
  const names=this.extractArtistNames(b).map(v=>this.normalizeArtist(v));
  if(names.some(v=>v.includes(left)||left.includes(v)))return 90;
  return Math.round(this.similarity(left,right)*100);
 }

 private extractArtistNames(v:string){return v.split(/[&,\/]/).flatMap(x=>[x,...((x.match(/CV[.:\s]*([^)&]+)/i)||[]).slice(1))]);}
 private normalizeArtist(v:string){return v.toLowerCase().replace(/\s+/g,"").replace(/[（）()\[\]【】]/g,"").replace(/cv[.:]/gi,"").replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]/g,"");}
 private textScore(a:string,b?:string,contains=85){if(!a||!b)return 0;const x=this.normalize(a),y=this.normalize(b);if(x===y)return 100;if(x.includes(y)||y.includes(x))return contains;return Math.round(this.similarity(x,y)*100);}
 private normalize(v:string){return v.toLowerCase().replace(/\(.*?\)/g,"").replace(/\[.*?\]/g,"").replace(/【.*?】/g,"").replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]/g,"");}
 private similarity(a:string,b:string){let same=0;const len=Math.max(a.length,b.length);for(let i=0;i<Math.min(a.length,b.length);i++)if(a[i]===b[i])same++;return len?same/len:0;}
 private getConfidence(score:number,d:MatchScoreDetails){if(d.title.score>=90&&d.artist.score>=70&&score>=85)return "high";if(score>=70)return "medium";return "low";}
}
