const SIZE = 10;
const CELL = 50;

let canvas = document.getElementById("gameCanvas");
let ctx = canvas.getContext("2d");

canvas.width = SIZE * CELL;
canvas.height = SIZE * CELL;

let board = [];
let currentPlayer = "X";
let gameMode = null;
let gameOver = false;

// ================= INIT =================
function resetBoard(){
    board = Array.from({length: SIZE}, () => Array(SIZE).fill(""));
    currentPlayer = "X";
    gameOver = false;
}

// ================= DRAW =================
function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);

    for(let r=0;r<SIZE;r++){
        for(let c=0;c<SIZE;c++){

            ctx.strokeRect(c*CELL,r*CELL,CELL,CELL);

            let x = c*CELL + CELL/2;
            let y = r*CELL + CELL/2;

            if(board[r][c]=="X"){
                ctx.beginPath();
                ctx.moveTo(x-15,y-15);
                ctx.lineTo(x+15,y+15);
                ctx.moveTo(x-15,y+15);
                ctx.lineTo(x+15,y-15);
                ctx.strokeStyle="red";
                ctx.stroke();
            }

            if(board[r][c]=="O"){
                ctx.beginPath();
                ctx.arc(x,y,15,0,Math.PI*2);
                ctx.strokeStyle="black";
                ctx.stroke();
            }
        }
    }
}

// ================= WIN =================
function checkWin(player){
    const dirs=[[1,0],[0,1],[1,1],[1,-1]];

    for(let r=0;r<SIZE;r++){
        for(let c=0;c<SIZE;c++){

            if(board[r][c]!==player) continue;

            for(let [dx,dy] of dirs){
                let cnt=0;

                for(let i=0;i<5;i++){
                    let nr=r+i*dx, nc=c+i*dy;
                    if(nr<0||nc<0||nr>=SIZE||nc>=SIZE) break;
                    if(board[nr][nc]==player) cnt++;
                }

                if(cnt==5) return true;
            }
        }
    }
    return false;
}

// ================= HEURISTIC =================
function score(player){
    let score=0;
    const dirs=[[1,0],[0,1],[1,1],[1,-1]];

    for(let r=0;r<SIZE;r++){
        for(let c=0;c<SIZE;c++){

            if(board[r][c]!==player) continue;

            for(let [dx,dy] of dirs){

                let count=0;
                let block=0;

                let i=r-dx,j=c-dy;
                if(i>=0&&j>=0&&i<SIZE&&j<SIZE && board[i][j]!="") block++;

                i=r; j=c;
                while(i>=0&&i<SIZE&&j>=0&&j<SIZE && board[i][j]==player){
                    count++; i+=dx; j+=dy;
                }

                if(!(i>=0&&i<SIZE&&j>=0&&j<SIZE) || board[i][j]!="") block++;

                if(count>=5) score+=100000;
                else if(count==4) score+= (block==0?10000:2000);
                else if(count==3) score+= (block==0?500:100);
                else if(count==2 && block==0) score+=50;
            }
        }
    }

    return score;
}

function evaluate(){
    return score("O") - score("X");
}

// ================= MOVES =================
function getMoves(){
    let moves=new Set();

    for(let r=0;r<SIZE;r++){
        for(let c=0;c<SIZE;c++){

            if(board[r][c]!=""){

                for(let dr=-1;dr<=1;dr++){
                    for(let dc=-1;dc<=1;dc++){

                        let nr=r+dr,nc=c+dc;

                        if(nr>=0&&nr<SIZE&&nc>=0&&nc<SIZE){
                            if(board[nr][nc]==""){
                                moves.add(nr+","+nc);
                            }
                        }
                    }
                }
            }
        }
    }

    if(moves.size===0) return [[5,5]];

    let scored=[];

    moves.forEach(m=>{
        let [r,c]=m.split(",").map(Number);

        board[r][c]="O";
        let s=evaluate();
        board[r][c]="";

        board[r][c]="X";
        s-=evaluate();
        board[r][c]="";

        scored.push([[r,c],s]);
    });

    scored.sort((a,b)=>b[1]-a[1]);

    return scored.slice(0,12).map(x=>x[0]);
}

// ================= MINIMAX =================
function minimax(depth, alpha, beta, maximizing){

    if(checkWin("O")) return 100000;
    if(checkWin("X")) return -100000;

    if(depth==0) return evaluate();

    if(maximizing){
        let maxEval=-Infinity;

        for(let [r,c] of getMoves()){
            board[r][c]="O";
            let val=minimax(depth-1,alpha,beta,false);
            board[r][c]="";

            maxEval=Math.max(maxEval,val);
            alpha=Math.max(alpha,val);

            if(beta<=alpha) break;
        }
        return maxEval;
    }else{
        let minEval=Infinity;

        for(let [r,c] of getMoves()){
            board[r][c]="X";
            let val=minimax(depth-1,alpha,beta,true);
            board[r][c]="";

            minEval=Math.min(minEval,val);
            beta=Math.min(beta,val);

            if(beta<=alpha) break;
        }
        return minEval;
    }
}

// ================= BEST MOVE =================
function bestMove(){
    let best=-Infinity;
    let move=null;

    let filled = board.flat().filter(x=>x!="").length;

    let depth;
    if(filled<4) depth=2;
    else if(filled<10) depth=3;
    else if(filled<18) depth=4;
    else depth=5;

    for(let [r,c] of getMoves()){
        board[r][c]="O";

        let val=minimax(depth,-Infinity,Infinity,false);

        board[r][c]="";

        if(val>best){
            best=val;
            move=[r,c];
        }
    }

    return move;
}

// ================= CLICK =================
canvas.addEventListener("click",(e)=>{

    if(gameOver) return;

    let rect=canvas.getBoundingClientRect();
    let x=e.clientX-rect.left;
    let y=e.clientY-rect.top;

    let c=Math.floor(x/CELL);
    let r=Math.floor(y/CELL);

    if(r<0||c<0||r>=SIZE||c>=SIZE) return;
    if(board[r][c]!="") return;

    board[r][c]=currentPlayer;

    if(checkWin(currentPlayer)){
        endGame(currentPlayer);
        return;
    }

    if(gameMode=="PVP"){
        currentPlayer = currentPlayer=="X"?"O":"X";
    }
    else{
        let move=bestMove();
        if(move){
            board[move[0]][move[1]]="O";

            if(checkWin("O")){
                endGame("AI");
                return;
            }
        }
    }

    draw();
});

// ================= UI =================
function startGame(mode){
    gameMode=mode;
    document.getElementById("menu").style.display="none";
    resetBoard();
    draw();
}

function endGame(winner){
    gameOver=true;
    document.getElementById("popup").classList.remove("hidden");
    document.getElementById("winnerText").innerText = winner + " WIN!";
}

function backToMenu(){
    document.getElementById("popup").classList.add("hidden");
    document.getElementById("menu").style.display="block";
}