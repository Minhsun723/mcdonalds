const pricePerPack = 200;
const probs = [0.20, 0.20, 0.15, 0.15, 0.15, 0.15];
const cumProbs = [];
probs.reduce((sum, p) => {
    const newSum = sum + p;
    cumProbs.push(newSum);
    return newSum;
}, 0);

if (cumProbs.length > 0 && Math.abs(cumProbs[cumProbs.length - 1] - 1.0) > 1e-9) {
    console.warn("累積機率總和不為 1，請檢查機率設定。目前總和:", cumProbs[cumProbs.length - 1]);
}

function simulateOnce() {
    const collected = new Set();
    let draws = 0;
    const numberOfTypes = probs.length;
    let safetyBreak = 0;
    const maxDraws = numberOfTypes * 300; // 稍微增加上限以應對極端情況

    while (collected.size < numberOfTypes && safetyBreak < maxDraws) {
        draws++;
        safetyBreak++;
        const r = Math.random();
        for (let i = 0; i < cumProbs.length; i++) {
            if (r < cumProbs[i]) {
                collected.add(i);
                break;
            }
        }
    }
    if (safetyBreak >= maxDraws && collected.size < numberOfTypes) {
        console.error(`模擬次數達到上限 (${maxDraws})，但仍未集齊所有種類 (${collected.size}/${numberOfTypes})。`);
    }
    return draws;
}

// --- DOM 元素獲取 ---
const modeSelectionDiv = document.getElementById('modeSelection');
const selectManualBtn = document.getElementById('selectManualBtn');
const selectAutoBtn = document.getElementById('selectAutoBtn');

const manualSimSectionDiv = document.getElementById('manualSimSection');
const simBtn = document.getElementById('simBtn');
const resultDiv = document.getElementById('result');

const autoSimSectionDiv = document.getElementById('autoSimSection');
const simulationCountInput = document.getElementById('simulationCount');
const startAutoSimBtn = document.getElementById('startAutoSimBtn');
const autoSimProgressDiv = document.getElementById('autoSimProgress');
const progressTextElem = document.getElementById('progressText');
const progressBarElem = document.getElementById('progressBar');
const autoSimResultDiv = document.getElementById('autoSimResult');

// --- 新增：獲取音效元素 ---
const simCompleteSound = document.getElementById('simCompleteSound');

// --- 播放音效的輔助函數 ---
function playSound(soundElement) {
    if (soundElement) {
        soundElement.currentTime = 0; // 從頭播放 (若短時間重複觸發)
        soundElement.play().catch(error => {
            // 捕獲並處理可能的播放錯誤，例如使用者尚未與頁面互動
            console.warn("音效播放失敗 (可能是瀏覽器限制，請先與頁面互動):", error);
        });
    }
}

// --- 模式選擇邏輯 ---
selectManualBtn.addEventListener('click', () => {
    manualSimSectionDiv.style.display = 'block';
    autoSimSectionDiv.style.display = 'none';

    selectManualBtn.classList.add('active');
    selectAutoBtn.classList.remove('active');

    resultDiv.innerHTML = '<p>&nbsp;</p>';
    resultDiv.classList.remove('fade-in');
    resultDiv.style.opacity = ''; // 清除行內 opacity，讓 CSS 的初始 opacity:0 生效
});

selectAutoBtn.addEventListener('click', () => {
    autoSimSectionDiv.style.display = 'block';
    manualSimSectionDiv.style.display = 'none';

    selectAutoBtn.classList.add('active');
    selectManualBtn.classList.remove('active');

    resultDiv.innerHTML = '<p>&nbsp;</p>'; // 清空單次結果
    resultDiv.classList.remove('fade-in');
    resultDiv.style.opacity = ''; // 清除單次結果的行內 opacity

    autoSimProgressDiv.style.display = 'none';
    progressBarElem.style.width = '0%';
    progressBarElem.textContent = '0%';
    progressTextElem.textContent = '模擬進行中...';
    autoSimResultDiv.style.display = 'none';
    autoSimResultDiv.classList.remove('fade-in');
});

// --- 單次模擬邏輯 ---
simBtn.addEventListener('click', () => {
    const computedStyle = window.getComputedStyle(resultDiv);
    const currentHeight = computedStyle.height;
    resultDiv.style.height = currentHeight;

    resultDiv.classList.remove('fade-in'); // 確保動畫能重複觸發
    autoSimResultDiv.style.display = 'none'; // 隱藏自動分析結果（如果之前顯示過）
    autoSimResultDiv.classList.remove('fade-in');


    resultDiv.innerHTML = `<p>努力計算中...</p>`;
    setTimeout(() => {
        const trials = simulateOnce();
        const cost = trials * pricePerPack;
        resultDiv.innerHTML = `
            <p>這次總共抽了 <strong>${trials}</strong> 次，<br>
            共花費 <strong>${new Intl.NumberFormat('zh-TW').format(cost)}</strong> 元新台幣！</p>
        `;
        void resultDiv.offsetWidth; // 強制回流以重啟動畫
        resultDiv.classList.add('fade-in');
        resultDiv.style.height = '';
        // --- 新增：播放音效 ---
        playSound(simCompleteSound);
    }, 50);
});

// --- 自動模擬邏輯 ---
startAutoSimBtn.addEventListener('click', () => {
    const numSimulations = parseInt(simulationCountInput.value, 10);

    if (isNaN(numSimulations) || numSimulations < 1 || numSimulations > 5000) {
        alert('請輸入有效的模擬次數 (1 到 5000 之間)。');
        simulationCountInput.focus();
        return;
    }

    startAutoSimBtn.disabled = true;
    simBtn.disabled = true; // 自動模擬時，也禁用單次模擬按鈕

    autoSimProgressDiv.style.display = 'block';
    autoSimResultDiv.style.display = 'none';
    autoSimResultDiv.classList.remove('fade-in');
    
    // 執行自動模擬時，確實將單次模擬結果區的行內 opacity 設為0，使其“隱藏”
    resultDiv.style.opacity = '0'; 
    resultDiv.classList.remove('fade-in');

    let allDraws = [];
    let totalDraws = 0;
    let minDraws = Infinity;
    let maxDraws = 0;

    function runSimulationBatch(currentIndex) {
        const batchSize = Math.min(50, numSimulations - currentIndex);
        for (let i = 0; i < batchSize; i++) {
            const draws = simulateOnce();
            allDraws.push(draws);
            totalDraws += draws;
            if (draws < minDraws) minDraws = draws;
            if (draws > maxDraws) maxDraws = draws;
        }
        const newCurrentIndex = currentIndex + batchSize;
        const progress = (newCurrentIndex / numSimulations) * 100;
        progressBarElem.style.width = progress + '%';
        progressBarElem.textContent = Math.round(progress) + '%';
        progressTextElem.textContent = `模擬進行中... (${newCurrentIndex}/${numSimulations})`;

        if (newCurrentIndex < numSimulations) {
            requestAnimationFrame(() => runSimulationBatch(newCurrentIndex));
        } else {
            displayAnalysisResults(allDraws, totalDraws, minDraws, maxDraws, numSimulations);
            startAutoSimBtn.disabled = false;
            simBtn.disabled = false; // 恢復單次模擬按鈕
            progressTextElem.textContent = `模擬完成！ (${numSimulations}/${numSimulations})`;
        }
    }
    requestAnimationFrame(() => runSimulationBatch(0));
});

function displayAnalysisResults(allDraws, totalDraws, minDraws, maxDraws, numSimulations) {
    const averageDraws = totalDraws / numSimulations;
    const averageCost = averageDraws * pricePerPack;
    allDraws.sort((a, b) => a - b);
    let medianDraws;
    const mid = Math.floor(numSimulations / 2);
    if (numSimulations % 2 === 0 && numSimulations > 0) {
        medianDraws = (allDraws[mid - 1] + allDraws[mid]) / 2;
    } else if (numSimulations > 0) {
        medianDraws = allDraws[mid];
    } else { medianDraws = 0; }
    const medianCost = medianDraws * pricePerPack;

    autoSimResultDiv.innerHTML = `
        <h3>自動模擬分析結果 (共 ${numSimulations} 次)</h3>
        <p>平均抽獎次數：<strong>${averageDraws.toFixed(2)}</strong> 次</p>
        <p>平均花費：<strong>${new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(averageCost)}</strong></p>
        <hr>
        <p>最歐手氣 (抽最少次)：<strong>${minDraws === Infinity ? 'N/A' : minDraws}</strong> 次 (花費 ${minDraws === Infinity ? 'N/A' : new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(minDraws * pricePerPack)})</p>
        <p>最非手氣 (抽最多次)：<strong>${maxDraws === 0 && minDraws === Infinity ? 'N/A' : maxDraws}</strong> 次 (花費 ${maxDraws === 0 && minDraws === Infinity ? 'N/A' : new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(maxDraws * pricePerPack)})</p>
        <p>抽獎次數中位數：<strong>${medianDraws.toFixed(1)}</strong> 次 (花費 ${new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(medianCost)})</p>
        <hr>
        <p class="description" style="text-align:center;"><strong>提醒：</strong>以上為 ${numSimulations} 次模擬的統計結果，<br>實際運氣還是要看個人造化喔！祝您好運！</p>
    `;
    autoSimResultDiv.style.display = 'block';
    void autoSimResultDiv.offsetWidth;
    autoSimResultDiv.classList.add('fade-in');
    // --- 新增：播放音效 ---
    playSound(simCompleteSound);
}
