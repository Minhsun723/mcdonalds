let toastTimeout = null; // 用於清除上一個提示的計時器
let isAbortRequested = false; // 中止請求標誌

/**
 * 顯示一個短暫的提示訊息框
 * @param {string} message 要顯示的訊息
 * @param {'info' | 'warning' | 'error'} type 訊息類型 ('info', 'warning', 'error')
 * @param {number} duration 訊息顯示的毫秒數
 */
function showToast(message, type = 'info', duration = 3000) {
    const toastElement = document.getElementById('toastNotification');
    const messageElement = document.getElementById('toastMessage');

    if (!toastElement || !messageElement) {
        const fallbackMessage = `[Toast Fallback - ${type.toUpperCase()}]: ${message}`;
        switch(type) {
            case 'warning': console.warn(fallbackMessage); break;
            case 'error': console.error(fallbackMessage); break;
            default: console.log(fallbackMessage);
        }
        return;
    }

    messageElement.textContent = message;
    toastElement.classList.remove('visible', 'warning', 'error');
    void toastElement.offsetWidth;

    if (type === 'warning') {
        toastElement.classList.add('warning');
    } else if (type === 'error') {
        toastElement.classList.add('error');
    }

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }
    toastElement.classList.add('visible');
    toastTimeout = setTimeout(() => {
        toastElement.classList.remove('visible');
        toastTimeout = null;
    }, duration);
}

document.addEventListener('DOMContentLoaded', function() {
    const backgroundTexturePaths = [
        'grass.jpeg',
        'stone.png',
        'wood.png',
        'dirt.jpg'
    ];
    const randomIndex = Math.floor(Math.random() * backgroundTexturePaths.length);
    const selectedTexturePath = backgroundTexturePaths[randomIndex];
    document.body.style.backgroundImage = `url('${selectedTexturePath}')`;
    if (selectedTexturePath.includes("YOUR_FILENAME_HERE")) {
        showToast("提醒：未設定正確背景圖片路徑，將使用預設背景。", "warning", 3000);
    }

    const defaultItemNames = ['大鳥姊姊鞘翅', '漢堡神偷殭屍', '薯條頭盔', '奶昔大哥龍蛋', '蘇打藥水', '大麥克方塊'];
    const defaultProbs = [0.20, 0.20, 0.15, 0.15, 0.15, 0.15];
    const defaultPricePerPack = 200;

    let pricePerPack = defaultPricePerPack;
    let probs = [...defaultProbs];
    let cumProbs = [];

    const displayPricePerPackElem = document.getElementById('displayPricePerPack');
    const displayItemCountElem = document.getElementById('displayItemCount');
    const dynamicProbabilityListElem = document.getElementById('dynamicProbabilityList');
    const selectManualBtn = document.getElementById('selectManualBtn');
    const selectAutoBtn = document.getElementById('selectAutoBtn');
    const manualSimSectionDiv = document.getElementById('manualSimSection');
    const simBtn = document.getElementById('simBtn');
    const resultDiv = document.getElementById('result');
    const autoSimSectionDiv = document.getElementById('autoSimSection');
    const simulationCountInput = document.getElementById('simulationCount');
    const startAutoSimBtn = document.getElementById('startAutoSimBtn');
    const abortAutoSimBtn = document.getElementById('abortAutoSimBtn');
    const autoSimProgressDiv = document.getElementById('autoSimProgress');
    const progressTextElem = document.getElementById('progressText');
    const progressBarElem = document.getElementById('progressBar');
    const autoSimResultDiv = document.getElementById('autoSimResult');
    const simCompleteSound = document.getElementById('simCompleteSound');
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsMenu = document.getElementById('settingsMenu');
    const unlimitedSimModeCheckbox = document.getElementById('unlimitedSimMode');
    const customModeCheckbox = document.getElementById('customMode');
    const customInputsArea = document.getElementById('customInputsArea');
    const customPriceInput = document.getElementById('customPrice');
    const customProbInputsContainer = document.getElementById('customProbInputsContainer');
    let customProbInputs = [];
    const customProbSumFeedback = document.getElementById('customProbSumFeedback');
    const applyCustomSettingsBtn = document.getElementById('applyCustomSettingsBtn');
    const resetToDefaultSettingsBtn = document.getElementById('resetToDefaultSettingsBtn');
    const copyrightBtn = document.getElementById('copyrightBtn');
    const copyrightSection = document.getElementById('copyrightSection');
    const backToSimBtn = document.getElementById('backToSimBtn');

    function calculateCumulativeProbs() {
        cumProbs = [];
        let sumForWarning = 0;
        probs.reduce((sum, p) => {
            const newSum = sum + p;
            cumProbs.push(newSum);
            sumForWarning = newSum;
            return newSum;
        }, 0);
        if (cumProbs.length > 0 && Math.abs(sumForWarning - 1.0) > 1e-9) {
            const sumPercent = (sumForWarning * 100).toFixed(2);
            showToast(`警告：機率總和不為 100% (目前 ${sumPercent}%)，請檢查設定。`, "warning", 3000);
        }
    }

    function calculateTheoreticalExpectedDraws(itemProbabilities) {
        const n = itemProbabilities.length;
        if (n === 0) return 0;
        const memo = new Map();
        function getE(collectedMask) {
            if (collectedMask === (1 << n) - 1) return 0;
            if (memo.has(collectedMask)) return memo.get(collectedMask);
            let probSumOfItemsNotYetCollected = 0;
            let expectedValueSumFromNextStates = 0;
            for (let i = 0; i < n; i++) {
                if (!((collectedMask >> i) & 1) && itemProbabilities[i] > 0) {
                    probSumOfItemsNotYetCollected += itemProbabilities[i];
                    expectedValueSumFromNextStates += itemProbabilities[i] * getE(collectedMask | (1 << i));
                }
            }
            if (probSumOfItemsNotYetCollected === 0) return Infinity;
            const result = (1 + expectedValueSumFromNextStates) / probSumOfItemsNotYetCollected;
            memo.set(collectedMask, result);
            return result;
        }
        const expectedDraws = getE(0);
        return isFinite(expectedDraws) ? expectedDraws : 0;
    }

    function simulateOnce() {
        const collected = new Set();
        let draws = 0;
        const numberOfTypes = probs.length;
        if (numberOfTypes === 0) return 0;
        let safetyBreak = 0;
        const maxDraws = numberOfTypes * 300; // Safety break for each simulation run
        const canCollectAnything = probs.some(p => p > 0);
        if (!canCollectAnything && numberOfTypes > 0) {
            showToast("錯誤：所有物品機率均為0，無法模擬。", "error", 3000);
            return maxDraws; // Return a high number to indicate an issue
        }
        while (collected.size < numberOfTypes && safetyBreak < maxDraws) {
            draws++;
            safetyBreak++;
            const r = Math.random();
            for (let i = 0; i < cumProbs.length; i++) {
                if (r < cumProbs[i]) {
                    if (probs[i] > 0) collected.add(i);
                    break;
                }
            }
        }
        if (safetyBreak >= maxDraws && collected.size < numberOfTypes) {
            showToast(`單次模擬達到上限 (${maxDraws}次) 仍未集齊 (${collected.size}/${numberOfTypes})。`, "warning", 3000);
        }
        return draws;
    }

    function updateInfoBoxDisplay() {
        if (displayPricePerPackElem) displayPricePerPackElem.textContent = `${pricePerPack} 元`;
        if (displayItemCountElem) displayItemCountElem.textContent = `${probs.length} 種`;
        if (dynamicProbabilityListElem) {
            dynamicProbabilityListElem.innerHTML = '';
            probs.forEach((prob, index) => {
                const itemName = defaultItemNames[index] || `物品 ${index + 1}`;
                let percentageString;
                const percentageVal = prob * 100;
                if (percentageVal % 1 === 0) percentageString = percentageVal.toFixed(0);
                else if (percentageVal * 10 % 1 === 0) percentageString = percentageVal.toFixed(1);
                else percentageString = percentageVal.toFixed(2);
                const listItem = document.createElement('li');
                listItem.innerHTML = `<span class="item-name">${itemName}</span><span class="item-separator"></span><strong class="percentage">${percentageString}%</strong>`;
                dynamicProbabilityListElem.appendChild(listItem);
            });
        }
    }

    function playSound(soundElement) {
        if (soundElement) {
            soundElement.currentTime = 0;
            soundElement.play().catch(error => console.warn("音效播放失敗:", error));
        }
    }

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

    simBtn.addEventListener('click', () => {
        resultDiv.classList.remove('fade-in');
        autoSimResultDiv.style.display = 'none';
        autoSimResultDiv.classList.remove('fade-in');
        resultDiv.innerHTML = `<p>努力計算中...</p>`;
        setTimeout(() => {
            const trials = simulateOnce();
            const cost = trials * pricePerPack;
            resultDiv.innerHTML = `<p>這次總共抽了 <strong>${trials}</strong> 次，<br>共花費 <strong>${new Intl.NumberFormat('zh-TW').format(cost)}</strong> 元新台幣！</p>`;
            void resultDiv.offsetWidth;
            resultDiv.classList.add('fade-in');
            playSound(simCompleteSound);
        }, 50);
    });

    startAutoSimBtn.addEventListener('click', () => {
        isAbortRequested = false;
        const numSimulations = parseInt(simulationCountInput.value, 10);

        if (isNaN(numSimulations) || numSimulations < 1) {
            alert(`請輸入有效的模擬次數 (至少為 1)。`);
            simulationCountInput.focus();
            return;
        }

        startAutoSimBtn.disabled = true;
        simBtn.disabled = true;
        selectManualBtn.disabled = true;
        selectAutoBtn.disabled = true;
        settingsBtn.disabled = true;

        if (unlimitedSimModeCheckbox.checked) { // 只有勾選無限制模式才顯示中止按鈕
            abortAutoSimBtn.style.display = 'inline-block';
            abortAutoSimBtn.disabled = false;
        }

        autoSimProgressDiv.style.display = 'block';
        autoSimResultDiv.style.display = 'none';
        autoSimResultDiv.classList.remove('fade-in');
        resultDiv.style.opacity = '0';
        resultDiv.classList.remove('fade-in');
        
        const theoreticalExpectedDraws = calculateTheoreticalExpectedDraws(probs);
        let allDraws = [];
        let totalDraws = 0;
        let minDraws = Infinity;
        let maxDraws = 0;
        let sumOfDuplicateProportions = 0;
        const numberOfUniqueItems = probs.length;

        function updateProgressUI(current, totalSims) {
            const progress = totalSims > 0 ? (current / totalSims) * 100 : 0;
            progressBarElem.style.width = progress + '%';
            progressBarElem.textContent = Math.round(progress) + '%';
            progressTextElem.textContent = `模擬進行中... (${current}/${totalSims})`;
            const creeperHeadElem = document.getElementById('creeperHead');
            if (creeperHeadElem) creeperHeadElem.style.left = progress + '%';
        }

        function finalizeSimulation(simulationsActuallyRun, wasAbortedByUser) {
            displayAnalysisResults(
                allDraws, totalDraws, minDraws, maxDraws, simulationsActuallyRun,
                theoreticalExpectedDraws, sumOfDuplicateProportions, wasAbortedByUser
            );
            startAutoSimBtn.disabled = false;
            simBtn.disabled = false;
            selectManualBtn.disabled = false;
            selectAutoBtn.disabled = false;
            settingsBtn.disabled = false;
            abortAutoSimBtn.style.display = 'none';
            abortAutoSimBtn.disabled = true;
            if (wasAbortedByUser) {
                progressTextElem.textContent = `模擬已中止！ (完成 ${simulationsActuallyRun} 次)`;
                showToast(`模擬已中止，共執行 ${simulationsActuallyRun} 次。`, "warning");
            } else {
                progressTextElem.textContent = `模擬完成！ (${simulationsActuallyRun}/${numSimulations})`;
            }
        }

        function runSimulationBatchRecursive(currentIndex) {
            if (isAbortRequested) {
                finalizeSimulation(currentIndex, true);
                return;
            }
            if (currentIndex >= numSimulations) {
                finalizeSimulation(currentIndex, false);
                return;
            }
            const batchSize = Math.min(50, numSimulations - currentIndex);
            for (let i = 0; i < batchSize; i++) {
                const draws = simulateOnce();
                allDraws.push(draws);
                totalDraws += draws;
                if (draws < minDraws) minDraws = draws;
                if (draws > maxDraws) maxDraws = draws;
                if (draws > 0 && numberOfUniqueItems > 0 && draws >= numberOfUniqueItems) {
                    sumOfDuplicateProportions += (draws - numberOfUniqueItems) / draws;
                }
            }
            const newCurrentIndex = currentIndex + batchSize;
            updateProgressUI(newCurrentIndex, numSimulations);
            if (newCurrentIndex < numSimulations && !isAbortRequested) {
                 requestAnimationFrame(() => runSimulationBatchRecursive(newCurrentIndex));
            } else if (!isAbortRequested) {
                finalizeSimulation(newCurrentIndex, false);
            } else { // isAbortRequested became true
                 finalizeSimulation(newCurrentIndex, true);
            }
        }
        updateProgressUI(0, numSimulations);
        requestAnimationFrame(() => runSimulationBatchRecursive(0));
    });

    abortAutoSimBtn.addEventListener('click', () => {
        isAbortRequested = true;
        abortAutoSimBtn.disabled = true;
        showToast("模擬中止請求已發送，將在當前批次處理後停止。", "info");
    });

    function displayAnalysisResults(
        allDraws, totalDraws, minDraws, maxDraws, actualSimulationsDone,
        theoreticalExpectedDraws, sumOfDuplicateProportions, wasAborted = false
    ) {
        const averageDraws = actualSimulationsDone > 0 ? totalDraws / actualSimulationsDone : 0;
        const averageCost = averageDraws * pricePerPack;
        allDraws.sort((a, b) => a - b);
        let medianDraws = 0;
        if (actualSimulationsDone > 0) {
            const mid = Math.floor(actualSimulationsDone / 2);
            if (actualSimulationsDone % 2 === 0) {
                medianDraws = (mid > 0 && allDraws.length > mid) ? (allDraws[mid - 1] + allDraws[mid]) / 2 : (allDraws.length > 0 ? allDraws[0] : 0);
            } else {
                medianDraws = allDraws[mid];
            }
        }
        const medianCost = medianDraws * pricePerPack;
        const theoreticalExpectedCost = theoreticalExpectedDraws * pricePerPack;
        const averageDuplicateRate = actualSimulationsDone > 0 ? sumOfDuplicateProportions / actualSimulationsDone : 0;

        let histogramHTML = '';
        if (actualSimulationsDone > 0 && allDraws.length > 0) {
            const bins = [
                { label: '6-10', min: 6, max: 10, count: 0 }, { label: '11-15', min: 11, max: 15, count: 0 },
                { label: '16-20', min: 16, max: 20, count: 0 }, { label: '21-25', min: 21, max: 25, count: 0 },
                { label: '26-30', min: 26, max: 30, count: 0 }, { label: '31-40', min: 31, max: 40, count: 0 },
                { label: '41-50', min: 41, max: 50, count: 0 }, { label: '51+', min: 51, max: Infinity, count: 0 }
            ];
            if (probs.length > 0) {
                bins[0].min = probs.length;
                bins[0].label = `${probs.length}-${Math.max(probs.length, 10)}`;
                if (probs.length > 10) {
                    bins[0].label = `${probs.length}-${probs.length + 4}`;
                    bins[0].max = probs.length + 4;
                }
            }
            allDraws.forEach(drawCount => {
                for (const bin of bins) if (drawCount >= bin.min && drawCount <= bin.max) { bin.count++; break; }
            });
            const maxFreq = Math.max(...bins.map(bin => bin.count), 0);
            const chartBarAreaMaxHeightPx = 100;
            histogramHTML = '<div class="histogram-container">';
            let hasDataInBins = false;
            bins.forEach(bin => {
                if (bin.count > 0 || (maxDraws > 0 && bin.min <= maxDraws && bin.max >= minDraws)) {
                    hasDataInBins = true;
                    const barPixelHeight = maxFreq > 0 ? Math.round((bin.count / maxFreq) * chartBarAreaMaxHeightPx) : 0;
                    histogramHTML += `<div class="histogram-bar-group"><div class="histogram-bar" style="height: ${barPixelHeight}px;" title="${bin.label}: ${bin.count} 次模擬"></div><div class="histogram-label">${bin.label}</div><div class="histogram-freq">${bin.count}次</div></div>`;
                }
            });
            histogramHTML += '</div>';
            if (!hasDataInBins && allDraws.length > 0) histogramHTML = '<div class="histogram-container"><p style="width:100%; text-align:center; color:#ccc; font-size:0.8em;">所有模擬結果均超出預設分組範圍，或數據過於分散。</p></div>';
            else if (allDraws.length === 0) histogramHTML = '<div class="histogram-container"><p style="width:100%; text-align:center; color:#ccc; font-size:0.8em;">無有效模擬數據生成分佈圖。</p></div>';
        } else {
            histogramHTML = `<div class="histogram-container"><p style="width:100%; text-align:center; color:#ccc; font-size:0.8em;">${actualSimulationsDone === 0 ? '無模擬數據' : '模擬次數不足'}，無法生成分佈圖。</p></div>`;
        }
        const resultTitle = wasAborted ? `自動模擬分析結果 (已中止於 ${actualSimulationsDone} 次)` : `自動模擬分析結果 (共 ${actualSimulationsDone} 次)`;
        const resultFooter = wasAborted ? `(已中止於 ${actualSimulationsDone} 次模擬)` : `(共 ${actualSimulationsDone} 次模擬)`;
        autoSimResultDiv.innerHTML = `<h3>${resultTitle}</h3><p>平均抽獎次數：<strong>${averageDraws.toFixed(2)}</strong> 次</p><p>平均花費：<strong>${new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(averageCost)}</strong></p><hr><p>最歐手氣 (抽最少次)：<strong>${minDraws === Infinity ? 'N/A' : minDraws}</strong> 次 (花費 ${minDraws === Infinity ? 'N/A' : new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(minDraws * pricePerPack)})</p><p>最非手氣 (抽最多次)：<strong>${(maxDraws === 0 && minDraws === Infinity && actualSimulationsDone === 0) ? 'N/A' : maxDraws}</strong> 次 (花費 ${ (maxDraws === 0 && minDraws === Infinity && actualSimulationsDone === 0) ? 'N/A' : new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(maxDraws * pricePerPack)})</p><p>抽獎次數中位數：<strong>${medianDraws.toFixed(1)}</strong> 次 (花費 ${new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(medianCost)})</p><hr><p>理論期望抽獎次數：<strong>${isFinite(theoreticalExpectedDraws) && theoreticalExpectedDraws > 0 ? theoreticalExpectedDraws.toFixed(2) : 'N/A'}</strong> 次</p><p>理論期望花費：<strong>${isFinite(theoreticalExpectedCost) && theoreticalExpectedCost > 0 ? new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(theoreticalExpectedCost) : 'N/A'}</strong></p><p>模擬中，抽到重複品的平均機率：<strong>${(averageDuplicateRate * 100).toFixed(2)}%</strong></p><hr class="info-divider"><h4>抽獎次數分佈圖：</h4>${histogramHTML}<hr class="info-divider"><p class="description" style="text-align:center;"><strong>提醒：</strong>以上為 ${resultFooter} 的統計結果，<br>實際運氣還是要看個人造化喔！祝您好運！</p>`;
        autoSimResultDiv.style.display = 'block';
        void autoSimResultDiv.offsetWidth;
        autoSimResultDiv.classList.add('fade-in');
        playSound(simCompleteSound);
        autoSimResultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    if (copyrightBtn && copyrightSection && backToSimBtn) {
        copyrightBtn.addEventListener('click', () => {
            copyrightSection.style.display = 'flex';
            setTimeout(() => copyrightSection.classList.add('visible'), 10);
            if (settingsMenu.classList.contains('visible')) settingsMenu.classList.remove('visible');
        });
        backToSimBtn.addEventListener('click', () => copyrightSection.classList.remove('visible'));
    }

    if (settingsBtn && settingsMenu) {
        settingsBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            settingsMenu.classList.toggle('visible');
            if (settingsMenu.classList.contains('visible') && copyrightSection.classList.contains('visible')) {
                copyrightSection.classList.remove('visible');
            }
        });
        settingsMenu.addEventListener('click', event => event.stopPropagation());
    }
    window.addEventListener('click', () => {
        if (settingsMenu && settingsMenu.classList.contains('visible')) settingsMenu.classList.remove('visible');
    });

    if (unlimitedSimModeCheckbox && simulationCountInput) {
        unlimitedSimModeCheckbox.addEventListener('change', function() {
            if (this.checked) {
                showToast("無限制模擬模式已啟用。您可以輸入更大的模擬次數。", "info", 3000);
                simulationCountInput.removeAttribute('max');
            } else {
                simulationCountInput.setAttribute('max', '5000');
                if (parseInt(simulationCountInput.value) > 5000) simulationCountInput.value = "5000";
                showToast("無限制模擬模式已停用，次數上限恢復為 5000。", "info", 3000);
            }
        });
    }

    function populateCustomInputs() {
        if (customPriceInput) customPriceInput.value = pricePerPack;
        customProbInputs.forEach((input, index) => {
            if (input && probs[index] !== undefined) {
                const percentageVal = probs[index] * 100;
                if (percentageVal % 1 === 0) input.value = percentageVal.toFixed(0);
                else input.value = percentageVal.toFixed(1);
            } else if (input) input.value = 0;
        });
        updateCustomProbSumFeedback();
    }

    function updateCustomProbSumFeedback() {
        if (!customProbSumFeedback) return;
        let currentSum = customProbInputs.reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);
        customProbSumFeedback.textContent = `總機率：${currentSum.toFixed(1)}%`;
        customProbSumFeedback.style.color = Math.abs(currentSum - 100.0) > 0.05 ? '#ff6b6b' : '#7ebf49';
    }

    if (customProbInputsContainer) {
        defaultItemNames.forEach((name, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'setting-item'; itemDiv.style.marginBottom = '5px';
            const label = document.createElement('label');
            label.htmlFor = `customProb${index}`; label.textContent = `${name}：`;
            Object.assign(label.style, { fontSize: '0.8em', flexBasis: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' });
            const input = document.createElement('input');
            Object.assign(input, { type: 'number', id: `customProb${index}`, className: 'custom-input-field prob-input', min: '0', max: '100', step: '0.1' });
            Object.assign(input.style, { width: '50px', fontSize: '0.75em', padding: '3px' });
            input.addEventListener('input', updateCustomProbSumFeedback);
            const percentSpan = document.createElement('span');
            percentSpan.textContent = '%'; Object.assign(percentSpan.style, { fontSize: '0.8em', marginLeft: '3px' });
            itemDiv.append(label, input, percentSpan);
            customProbInputsContainer.appendChild(itemDiv);
            customProbInputs.push(input);
        });
    }

    if (customModeCheckbox) {
        customModeCheckbox.addEventListener('change', function() {
            if (this.checked) {
                if (customInputsArea) customInputsArea.style.display = 'block';
                populateCustomInputs();
                showToast("自訂義模式已啟用。", "info");
            } else {
                if (customInputsArea) customInputsArea.style.display = 'none';
                pricePerPack = defaultPricePerPack; probs = [...defaultProbs];
                calculateCumulativeProbs(); updateInfoBoxDisplay();
                populateCustomInputs(); // Keep custom inputs populated with defaults
                showToast("自訂義模式已停用，恢復預設值。", "info");
            }
        });
    }

    if (applyCustomSettingsBtn) {
        applyCustomSettingsBtn.addEventListener('click', () => {
            const newCustomPrice = parseInt(customPriceInput.value, 10);
            if (isNaN(newCustomPrice) || newCustomPrice < 0) {
                showToast("請輸入有效的套餐單價（非負整數）。", "warning"); customPriceInput.focus(); return;
            }
            const newCustomProbsPercentages = customProbInputs.map(input => parseFloat(input.value));
            if (newCustomProbsPercentages.some(isNaN)) {
                showToast("部分機率值無效，請檢查輸入。", "warning"); return;
            }
            let probSumPercentage = newCustomProbsPercentages.reduce((sum, p) => sum + p, 0);
            if (Math.abs(probSumPercentage - 100.0) > 0.05) {
                alert(`機率總和必須為 100%！目前總和為 ${probSumPercentage.toFixed(1)}%。請調整後再套用。`); return;
            }
            pricePerPack = newCustomPrice; probs = newCustomProbsPercentages.map(p => p / 100.0);
            calculateCumulativeProbs(); updateInfoBoxDisplay();
            showToast("自訂設定已成功套用！", "info");
        });
    }

    if (resetToDefaultSettingsBtn) {
        resetToDefaultSettingsBtn.addEventListener('click', () => {
            pricePerPack = defaultPricePerPack; probs = [...defaultProbs];
            calculateCumulativeProbs(); updateInfoBoxDisplay();
            if (customModeCheckbox.checked && customInputsArea) populateCustomInputs();
            showToast("已恢復為預設設定！", "info");
        });
    }

    calculateCumulativeProbs();
    updateInfoBoxDisplay();
});
