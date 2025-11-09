export type FocusStatus = "FOCUSED" | "NOT FOCUSED" | "PAUSED";

export interface FocusEngine{
    update(faceLandmarks: any, now: number): FocusStatus;
    notifyNoFace(now: number): FocusStatus;
    resetCalibration(now: number): void;
    getThresholds(): {l: number; r: number; avg: number} | null;
    isFocused(): boolean;
    notFocusedSince(): number | null;
}

// configuration
const CALIB_SECONDS = 3.0;
const EAR_FALLBACK_OPEN = 0.23;
const EAR_MIN_CLAMP = 0.18;
const EAR_MARGIN = 0.85;
const AVG_MARGIN = 0.88;
const DEBOUNCE_FRAMES = 5; //frames consecutive ones to flip to focused
const UNFOCUS_MISS_FRAMES = 9;//consecutive frames to flip to not focused
const EITHER_EYE_OK = true;
const USE_AVG_GUARD = true;

//Eye Landmark indices (MediaPipe Face Landmarker)
const L_EYE = [33, 159, 158, 133, 153, 144];
const R_EYE = [362, 386, 385, 263, 374, 373];

//Helpers
type Pt = {x: number; y: number};

//vertical distances sum / 2 * horizontal distance
function ear6(p: Pt[]): number{
    const v1 = Math.hypot(p[1].x - p[5].x, p[1].y - p[5].y);
    const v2 = Math.hypot(p[2].x - p[4].x, p[2].y - p[5].y);
    const h = Math.hypot(p[0].x - p[3].x, p[0].y - p[3].y);
    return h > 1e-6 ? (v1 + v2) / (2 * h): 0;
}

function median(a: number[]): number| undefined{
    if(!a?.length) return undefined;
    const s = [...a].sort((x,y)=> x- y);
    const n = s.length;
    return n % 2? s[n >> 1]: (s[n/2 - 1]+ s[n/2])/2;
}

//options
export interface FocusEngineOptions{
    emitPaused?: boolean;
    notFocusedLimitSec?: number;
}

export function createFocusEngine(opts: FocusEngineOptions= {}):FocusEngine{
    const emitPaused = !!opts.emitPaused;
    const NOT_FOCUSED_LIMIT_S = Math.max(1, Math.floor(opts.notFocusedLimitSec??30));

    //calibration for the first calib seconds
    let calibStartTs: number | null = null;
    let calibL: number[] = [];
    let calibR: number[] = [];
    let calibAVG: number[] = [];

    // computed thresholds after calibration
    let thr: {l: number; r: number; avg: number} | null = null;

    //focus state and debouncing
    let focused = false;
    let okCnt = 0;
    let missCnt = 0;
    let notFocusedSinceTs: number | null = null;

    const resetCalibration = (now: number) =>{
        calibStartTs = now;
        calibL = [];
        calibR = [];
        calibAVG = [];
        thr = null;

        focused = false;
        okCnt = 0;
        missCnt = 0;
        notFocusedSinceTs = null;
    }

    const maybeCalibrate = (now: number, lEAR: number, rEAR: number)=>{
        // collect EAR samples during initial CALIB_SECONDS
        if(calibStartTs!= null && (now - calibStartTs) <= CALIB_SECONDS * 1000){
            calibL.push(lEAR);
            calibR.push(rEAR);
            calibAVG.push((lEAR+rEAR)/2);
            return;
        }

        //if unable to do it, compute once
        if(calibStartTs!= null && thr == null){
            const medL = median(calibL) ?? EAR_FALLBACK_OPEN;
            const medR = median(calibR) ?? EAR_FALLBACK_OPEN;
            const medAVG = median(calibAVG)?? EAR_FALLBACK_OPEN;
            const l_thr = Math.max(EAR_MIN_CLAMP, medL * EAR_MARGIN);
            const r_thr = Math.max(EAR_MIN_CLAMP, medR * EAR_MARGIN);
            const a_thr  = Math.max(EAR_MIN_CLAMP, medAVG * AVG_MARGIN);
            thr = { l: l_thr, r: r_thr, avg: a_thr };
        }
    };

    //initial calibration to start at now = 0
    resetCalibration(0);

    const stepWithEAR = (lEAR: number, rEAR: number, now: number): FocusStatus =>{
        maybeCalibrate(now, lEAR, rEAR);

        const {l, r, avg} = thr ?? {l: EAR_FALLBACK_OPEN, r: EAR_FALLBACK_OPEN, avg: EAR_FALLBACK_OPEN};
        const avgEAR = (lEAR + rEAR) /2;
        const perEyePass = EITHER_EYE_OK ? (lEAR > l || rEAR > r) : (lEAR > l && rEAR > r);
        const avgPass = USE_AVG_GUARD ? (avgEAR > avg): false;
        const eyesOpen = perEyePass || avgPass;

        if(eyesOpen){
            okCnt ++;
            missCnt = 0;
            if(!focused && okCnt >= DEBOUNCE_FRAMES){
                focused = true;
                notFocusedSinceTs= null;
            }
        }else{
            missCnt ++;
            okCnt = 0;
            if(focused && missCnt >= UNFOCUS_MISS_FRAMES){
                focused = false;
                if(notFocusedSinceTs == null) notFocusedSinceTs = now;
            }else if(!focused && notFocusedSinceTs== null){
                notFocusedSinceTs = now;
            }
        }

        if(!focused && emitPaused && notFocusedSinceTs != null){
            const dt = (now - notFocusedSinceTs)/1000;
            if(dt >= NOT_FOCUSED_LIMIT_S) return "PAUSED";
        }
        return focused?"FOCUSED": "NOT FOCUSED";
    };

    return {
        update(faceLandmarks, now){
            const px = (i: number): Pt =>{
                const p = faceLandmarks[i];
                return {x: p.x, y: p.y};
            };

            const L: Pt[] = L_EYE.map(px);
            const R: Pt[] = R_EYE.map(px);

            const lEAR = ear6(L);
            const rEAR = ear6(R);

            return stepWithEAR(lEAR, rEAR, now);
        },
        notifyNoFace(now){
            okCnt = 0;
            missCnt++;
            if(focused && missCnt >= UNFOCUS_MISS_FRAMES){
                focused = false;
                if(notFocusedSinceTs== null) notFocusedSinceTs = now;
            }else if(!focused && notFocusedSinceTs== null){
                notFocusedSinceTs = now;
            }

            if(!focused && emitPaused && notFocusedSinceTs != null){
                const dt = (now - notFocusedSinceTs)/1000;
                if(dt>= NOT_FOCUSED_LIMIT_S) return "PAUSED"
            }
            return focused?"FOCUSED":"NOT FOCUSED";
        },
        resetCalibration(now){
            resetCalibration(now);
        },
        getThresholds(){
            return thr;
        },
        isFocused(){
            return focused;
        },
        notFocusedSince(){
            return notFocusedSinceTs;
        }
    }


}