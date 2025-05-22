document.addEventListener('DOMContentLoaded', function() {
    // 請將下面的檔案名稱替換成您放在專案根目錄下的實際圖片檔案名稱
    const backgroundTexturePaths = [
        'grass.jpeg',   // 例如：您的草地材質 (請替換)
        'stone.png',    // 例如：您的石頭材質 (請替換)
        'wood.png',     // 例如：您的木頭材質 (請替換)
        'dirt.jpg'
    ];

    // 隨機選擇一個背景圖片的路徑
    const randomIndex = Math.floor(Math.random() * backgroundTexturePaths.length);
    const selectedTexturePath = backgroundTexturePaths[randomIndex];

    // 設定 body 的背景圖片
    document.body.style.backgroundImage = `url('${selectedTexturePath}')`;

    // 簡易檢查，如果您的檔名包含 "YOUR_" 或類似的預設提示字串，可以保留此檢查
    if (selectedTexturePath.includes("YOUR_FILENAME_HERE")) {
        console.warn("提醒：您可能還沒有設定正確的本地隨機背景圖片路徑！將使用 CSS 中的預設背景。實際設定路徑: " + selectedTexturePath);
    }
    // 版權年份的程式碼已移除，依照您的版本
});

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

// --- 新增：計算理論期望抽獎次數的函數 ---
function calculateTheoreticalExpectedDraws(itemProbabilities) {
    const n = itemProbabilities.length;
    const memo = new Map();

    function getE(collectedMask) {
        if (collectedMask === (1 << n) - 1) { // 所有 n 個位元都為 1，表示全部收集
            return 0; // 已全部收集，期望為 0
        }
        if (memo.has(collectedMask)) {
            return memo.get(collectedMask);
        }

        let probSumOfItemsNotYetCollected = 0;
        let expectedValueSumFromNextStates = 0;

        for (let i = 0; i < n; i++) {
            if (!((collectedMask >> i) & 1)) { // 如果第 i 個物品尚未收集
                probSumOfItemsNotYetCollected += itemProbabilities[i];
                expectedValueSumFromNextStates += itemProbabilities[i] * getE(collectedMask | (1 << i));
            }
        }

        if (probSumOfItemsNotYetCollected === 0) { 
            return 0; 
        }
        
        const result = (1 + expectedValueSumFromNextStates) / probSumOfItemsNotYetCollected;
        memo.set(collectedMask, result);
        return result;
    }

    return getE(0); // 初始時，已收集的物品為空集合 (mask = 0)
}
// --- 計算理論期望抽獎次數的函數結束 ---

function simulateOnce() {
    const collected = new Set();
    let draws = 0;
    const numberOfTypes = probs.length;
    let safetyBreak = 0;
    const maxDraws = numberOfTypes * 300; 

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

const simCompleteSound = document.getElementById('simCompleteSound');

// --- 播放音效的輔助函數 ---
function playSound(soundElement) {
    if (soundElement) {
        soundElement.currentTime = 0;
        soundElement.play().catch(error => {
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
    resultDiv.style.opacity = '';
});

selectAutoBtn.addEventListener('click', () => {
    autoSimSectionDiv.style.display = 'block';
    manualSimSectionDiv.style.display = 'none';
    selectAutoBtn.classList.add('active');
    selectManualBtn.classList.remove('active');
    resultDiv.innerHTML = '<p>&nbsp;</p>';
    resultDiv.classList.remove('fade-in');
    resultDiv.style.opacity = '';
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
    resultDiv.classList.remove('fade-in');
    autoSimResultDiv.style.display = 'none';
    autoSimResultDiv.classList.remove('fade-in');

    resultDiv.innerHTML = `<p>努力計算中...</p>`;
    setTimeout(() => {
        const trials = simulateOnce();
        const cost = trials * pricePerPack;
        resultDiv.innerHTML = `
            <p>這次總共抽了 <strong>${trials}</strong> 次，<br>
            共花費 <strong>${new Intl.NumberFormat('zh-TW').format(cost)}</strong> 元新台幣！</p>
        `; // 依照您提供的版本，不包含第二句提示
        void resultDiv.offsetWidth;
        resultDiv.classList.add('fade-in');
        resultDiv.style.height = '';
        playSound(simCompleteSound);
    }, 50);
});

// --- 自動模擬邏輯 ---
startAutoSimBtn.addEventListener('click', () => {
    const numSimulations = parseInt(simulationCountInput.value, 10);

    // 修改：使模擬次數上限的判斷與提示文字和HTML input的max="5000"一致
    if (isNaN(numSimulations) || numSimulations < 1 || numSimulations > 5000) {
        alert('請輸入有效的模擬次數 (1 到 5000 之間)。');
        simulationCountInput.focus();
        return;
    }

    startAutoSimBtn.disabled = true;
    simBtn.disabled = true;
    autoSimProgressDiv.style.display = 'block';
    autoSimResultDiv.style.display = 'none';
    autoSimResultDiv.classList.remove('fade-in');
    resultDiv.style.opacity = '0'; 
    resultDiv.classList.remove('fade-in');

    // --- 新增：計算理論期望值 ---
    const theoreticalExpectedDraws = calculateTheoreticalExpectedDraws(probs);
    // --- 新增結束 ---

    let allDraws = [];
    let totalDraws = 0;
    let minDraws = Infinity;
    let maxDraws = 0;
    let sumOfDuplicateProportions = 0; // <-- 新增：用於計算平均重複品機率
    const numberOfUniqueItems = probs.length; // 新增：獲取盲盒種類數量

    function runSimulationBatch(currentIndex) {
        const batchSize = Math.min(50, numSimulations - currentIndex);
        for (let i = 0; i < batchSize; i++) {
            const draws = simulateOnce();
            allDraws.push(draws);
            totalDraws += draws;
            if (draws < minDraws) minDraws = draws;
            if (draws > maxDraws) maxDraws = draws;

            // --- 新增：累計重複品比例 ---
            if (draws > 0) { // 避免除以零 (雖然 draws 應該總是 >= numberOfUniqueItems)
                sumOfDuplicateProportions += (draws - numberOfUniqueItems) / draws;
            }
            // --- 新增結束 ---
        }
        const newCurrentIndex = currentIndex + batchSize;
        const progress = (newCurrentIndex / numSimulations) * 100;
        progressBarElem.style.width = progress + '%';
        progressBarElem.textContent = Math.round(progress) + '%';
        progressTextElem.textContent = `模擬進行中... (${newCurrentIndex}/${numSimulations})`;
        
        const creeperHeadElem = document.getElementById('creeperHead');
        if (creeperHeadElem) {
            creeperHeadElem.style.left = progress + '%';
        }

        if (newCurrentIndex < numSimulations) {
            requestAnimationFrame(() => runSimulationBatch(newCurrentIndex));
        } else {
            // --- 修改：傳遞新計算的值給 displayAnalysisResults ---
            displayAnalysisResults(
                allDraws, totalDraws, minDraws, maxDraws, numSimulations,
                theoreticalExpectedDraws, // 理論期望抽數
                sumOfDuplicateProportions // 重複品比例總和
            );
            // --- 修改結束 ---
            startAutoSimBtn.disabled = false;
            simBtn.disabled = false;
            progressTextElem.textContent = `模擬完成！ (${numSimulations}/${numSimulations})`;
        }
    }
    requestAnimationFrame(() => runSimulationBatch(0));
});

// --- 修改 displayAnalysisResults 函數簽名和內容 ---
function displayAnalysisResults(
    allDraws, totalDraws, minDraws, maxDraws, numSimulations,
    theoreticalExpectedDraws, // 新增參數
    sumOfDuplicateProportions  // 新增參數
) {
    const averageDraws = numSimulations > 0 ? totalDraws / numSimulations : 0;
    const averageCost = averageDraws * pricePerPack;
    
    allDraws.sort((a, b) => a - b);
    let medianDraws;
    const mid = Math.floor(numSimulations / 2);
    if (numSimulations % 2 === 0 && numSimulations > 0) {
        medianDraws = (allDraws[mid - 1] + allDraws[mid]) / 2;
    } else if (numSimulations > 0) {
        medianDraws = allDraws[mid];
    } else { 
        medianDraws = 0; 
    }
    const medianCost = medianDraws * pricePerPack;

    // --- 新增：計算理論期望花費和平均重複品機率 ---
    const theoreticalExpectedCost = theoreticalExpectedDraws * pricePerPack;
    const averageDuplicateRate = numSimulations > 0 ? sumOfDuplicateProportions / numSimulations : 0;
    // --- 新增結束 ---

    // 保持您原有的中文詞句，並插入新的統計數據
    autoSimResultDiv.innerHTML = `
        <h3>自動模擬分析結果 (共 ${numSimulations} 次)</h3>
        <p>平均抽獎次數：<strong>${averageDraws.toFixed(2)}</strong> 次</p>
        <p>平均花費：<strong>${new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(averageCost)}</strong></p>
        <hr>
        <p>最歐手氣 (抽最少次)：<strong>${minDraws === Infinity ? 'N/A' : minDraws}</strong> 次 (花費 ${minDraws === Infinity ? 'N/A' : new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(minDraws * pricePerPack)})</p>
        <p>最非手氣 (抽最多次)：<strong>${maxDraws === 0 && minDraws === Infinity ? 'N/A' : maxDraws}</strong> 次 (花費 ${maxDraws === 0 && minDraws === Infinity ? 'N/A' : new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(maxDraws * pricePerPack)})</p>
        <p>抽獎次數中位數：<strong>${medianDraws.toFixed(1)}</strong> 次 (花費 ${new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(medianCost)})</p>
        <hr>
        <p>理論期望抽獎次數：<strong>${theoreticalExpectedDraws.toFixed(2)}</strong> 次</p>
        <p>理論期望花費：<strong>${new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(theoreticalExpectedCost)}</strong></p>
        <p>模擬中，抽到重複品的平均機率：<strong>${(averageDuplicateRate * 100).toFixed(2)}%</strong></p>
        <hr>
        <p class="description" style="text-align:center;"><strong>提醒：</strong>以上為 ${numSimulations} 次模擬的統計結果，<br>實際運氣還是要看個人造化喔！祝您好運！</p>
    `;
    autoSimResultDiv.style.display = 'block';
    void autoSimResultDiv.offsetWidth;
    autoSimResultDiv.classList.add('fade-in');
    playSound(simCompleteSound);
}
// --- displayAnalysisResults 修改結束 ---
