document.addEventListener('DOMContentLoaded', () => {
    // DOM 요소 가져오기
    const currentPointsSpan = document.getElementById('currentPoints');
    const bankerWinsSpan = document.getElementById('bankerWins');
    const playerWinsSpan = document.getElementById('playerWins');
    const tieCountSpan = document.getElementById('tieCount');
    const winRateSpan = document.getElementById('winRate');
    const betBankerBtn = document.getElementById('betBanker');
    const betPlayerBtn = document.getElementById('betPlayer');
    const betTieBtn = document.getElementById('betTie');
    const betAmountInput = document.getElementById('betAmount');
    const betMaxBtn = document.getElementById('betMax');
    const placeBetBtn = document.getElementById('placeBet');
    const resetGameBtn = document.getElementById('resetGame');
    const bigRoadDiv = document.getElementById('bigRoad');
    const gameMessage = document.getElementById('gameMessage');

    // 게임 상태 변수
    let currentPoints = 1000;
    let totalGames = 0;
    let correctPredictions = 0;
    let bankerWins = 0;
    let playerWins = 0;
    let tieCount = 0;
    let selectedBet = null; // 'B', 'P', 'T' 중 하나
    let currentRoadmap = []; // 출목표 데이터 (예: [['B', 'B'], ['P'], ['B', 'B', 'B']])
    let currentRow = 0; // 현재 출목표 행 인덱스
    let currentCol = 0; // 현재 출목표 열 인덱스

    // 바카라 결과 확률 (8덱 기준)
    const PROB_BANKER = 0.4586;
    const PROB_PLAYER = 0.4462;
    const PROB_TIE = 0.0952;

    // UI 업데이트 함수
    function updateUI() {
        currentPointsSpan.textContent = currentPoints;
        bankerWinsSpan.textContent = bankerWins;
        playerWinsSpan.textContent = playerWins;
        tieCountSpan.textContent = tieCount;
        winRateSpan.textContent = totalGames > 0 ? ((correctPredictions / totalGames) * 100).toFixed(2) + '%' : '0.00%';
        betAmountInput.max = currentPoints; // 베팅 금액 최대값 설정
    }

    // 출목표 그리기 함수
    function drawRoadmap() {
        bigRoadDiv.innerHTML = ''; // 초기화
        const maxRows = 6; // 한 열에 표시할 최대 행 수
        const maxCols = 12; // 표시할 최대 열 수 (스크롤 가능하게 하려면 더 늘릴 수 있음)

        // 가로 스크롤을 위해 열 개수를 동적으로 조절
        // currentRoadmap의 가장 긴 열을 기준으로 최소 12개 열 유지
        let actualCols = 0;
        if (currentRoadmap.length > 0) {
            actualCols = currentRoadmap.reduce((max, col) => Math.max(max, col.length), 0);
        }
        const displayCols = Math.max(maxCols, actualCols);

        // 그리드 템플릿 열 설정
        bigRoadDiv.style.gridTemplateColumns = `repeat(${displayCols}, 30px)`;

        // 출목표 데이터 채우기
        for (let r = 0; r < maxRows; r++) {
            for (let c = 0; c < displayCols; c++) {
                const cell = document.createElement('div');
                cell.classList.add('roadmap-cell-placeholder'); // 비어있는 셀의 placeholder
                if (currentRoadmap[c] && currentRoadmap[c][r]) {
                    const result = currentRoadmap[c][r];
                    cell.classList.add('roadmap-cell', result);
                }
                bigRoadDiv.appendChild(cell);
            }
        }

        // 현재 위치에 표시할 셀을 명확히 함 (개발용, 실제 게임에서는 필요 없을 수 있음)
        // if (currentCol < displayCols && currentRow < maxRows && currentRoadmap[currentCol]) {
        //     const targetCellIndex = currentRow * displayCols + currentCol;
        //     const targetCell = bigRoadDiv.children[targetCellIndex];
        //     if (targetCell) {
        //         targetCell.style.border = '2px dashed yellow'; // 현재 추가될 위치 표시
        //     }
        // }
    }

    // 게임 결과 생성 함수
    function generateResult() {
        const rand = Math.random();
        if (rand < PROB_BANKER) {
            return 'B'; // Banker
        } else if (rand < PROB_BANKER + PROB_PLAYER) {
            return 'P'; // Player
        } else {
            return 'T'; // Tie
        }
    }

    // 출목표에 결과 추가
    function addResultToRoadmap(result) {
        // 이전 결과와 현재 결과 비교하여 새로운 열 또는 행 결정
        const lastColResults = currentRoadmap.length > 0 ? currentRoadmap[currentRoadmap.length - 1] : [];
        const lastResult = lastColResults.length > 0 ? lastColResults[0] : null; // 가장 위(첫 번째) 결과를 기준으로 줄 판단

        if (result === 'T') {
            // 타이는 현재 열의 마지막 결과에 추가하거나, 독립적으로 표시
            // 여기서는 독립적인 열로 추가하는 방식 사용
            if (currentCol >= 0 && currentRoadmap[currentCol]) {
                 currentRoadmap[currentCol].push(result); // 현재 열에 타이 추가
            } else { // 새로운 열에 추가해야 하는 경우 (예: 게임 시작 시 첫 타이)
                currentRoadmap.push([result]);
                currentCol = currentRoadmap.length - 1; // 새 열로 이동
            }
        } else if (lastResult === result) { // 이전 결과와 동일 (줄 이어감)
            currentRoadmap[currentCol].push(result);
        } else { // 이전 결과와 다름 (새로운 줄 시작)
            currentRoadmap.push([result]);
            currentCol = currentRoadmap.length - 1; // 새 열로 이동
        }

        // 행 인덱스 업데이트 (Big Road는 주로 첫 행으로 판단)
        // 여기서는 그냥 push하므로 행 인덱스는 크게 중요하지 않지만,
        // 시각화 시에는 열의 길이로 판단해야 함
        
        drawRoadmap();
        // 출목표가 넘치면 자동으로 스크롤
        bigRoadDiv.scrollTop = bigRoadDiv.scrollHeight;
    }

    // 초기 게임 진행 (패턴 학습용)
    function initialGameRounds(count) {
        for (let i = 0; i < count; i++) {
            const result = generateResult();
            if (result === 'B') bankerWins++;
            else if (result === 'P') playerWins++;
            else tieCount++;
            addResultToRoadmap(result);
        }
        updateUI();
    }

    // 베팅 선택 핸들러
    function selectBet(event) {
        // 모든 베팅 버튼에서 'selected' 클래스 제거
        document.querySelectorAll('.bet-button').forEach(btn => {
            btn.classList.remove('selected');
        });

        // 클릭된 버튼에 'selected' 클래스 추가
        event.target.classList.add('selected');
        selectedBet = event.target.id === 'betBanker' ? 'B' :
                      event.target.id === 'betPlayer' ? 'P' : 'T';
    }

    // 베팅하기 버튼 클릭 핸들러
    function handlePlaceBet() {
        if (selectedBet === null) {
            gameMessage.textContent = '먼저 베팅 대상을 선택하세요 (뱅커/플레이어/타이).';
            return;
        }

        let betAmount = parseInt(betAmountInput.value, 10);
        if (isNaN(betAmount) || betAmount <= 0) {
            gameMessage.textContent = '올바른 베팅 금액을 입력하세요.';
            return;
        }
        if (betAmount > currentPoints) {
            gameMessage.textContent = '포인트가 부족합니다.';
            return;
        }

        // 게임 진행 및 결과 처리
        const gameResult = generateResult();
        gameMessage.textContent = `결과: ${gameResult === 'B' ? '뱅커' : gameResult === 'P' ? '플레이어' : '타이'}!`;

        totalGames++; // 총 게임 횟수 증가

        let pointsChange = 0;
        if (gameResult === 'B') bankerWins++;
        else if (gameResult === 'P') playerWins++;
        else tieCount++;

        if (gameResult === 'T') {
            if (selectedBet === 'T') { // 타이 예측 성공
                pointsChange = betAmount * 8; // 8배 획득
                currentPoints += pointsChange;
                correctPredictions++;
                gameMessage.textContent += ` 타이 예측 성공! ${pointsChange} 포인트 획득!`;
            } else { // 타이인데 뱅커/플레이어 베팅
                gameMessage.textContent += ' 타이 발생! 베팅 금액은 보존됩니다.';
                // 포인트 변화 없음 (푸시)
            }
        } else if (selectedBet === gameResult) { // 뱅커/플레이어 예측 성공
            pointsChange = betAmount; // 1배 획득
            currentPoints += pointsChange;
            correctPredictions++;
            gameMessage.textContent += ` 예측 성공! ${pointsChange} 포인트 획득!`;
        } else { // 예측 실패
            pointsChange = -betAmount; // 베팅 금액 잃음
            currentPoints += pointsChange;
            gameMessage.textContent += ` 예측 실패... ${betAmount} 포인트 잃었습니다.`;
        }
        
        addResultToRoadmap(gameResult); // 출목표에 결과 추가
        updateUI();

        if (currentPoints <= 0) {
            gameMessage.textContent = '포인트가 모두 소진되었습니다! 게임 오버. 초기화 버튼을 눌러 다시 시작하세요.';
            placeBetBtn.disabled = true; // 베팅 버튼 비활성화
        }
    }

    // 게임 초기화
    function resetGame() {
        currentPoints = 1000;
        totalGames = 0;
        correctPredictions = 0;
        bankerWins = 0;
        playerWins = 0;
        tieCount = 0;
        selectedBet = null;
        currentRoadmap = [];
        currentRow = 0;
        currentCol = 0;
        gameMessage.textContent = '';
        betAmountInput.value = 10;
        placeBetBtn.disabled = false;
        
        document.querySelectorAll('.bet-button').forEach(btn => {
            btn.classList.remove('selected');
        });
        initialGameRounds(15); // 게임 초기화 시 다시 15라운드 자동 진행
        updateUI();
    }

    // 이벤트 리스너
    betBankerBtn.addEventListener('click', selectBet);
    betPlayerBtn.addEventListener('click', selectBet);
    betTieBtn.addEventListener('click', selectBet);
    betMaxBtn.addEventListener('click', () => {
        betAmountInput.value = currentPoints;
    });
    placeBetBtn.addEventListener('click', handlePlaceBet);
    resetGameBtn.addEventListener('click', resetGame);

    // 초기 설정
    resetGame(); // 게임 시작 시 초기화
});