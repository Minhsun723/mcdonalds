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
        console.warn("提醒：您可能還沒有設定正確的本地隨機背景圖片路徑！將使用 CSS 中的預設背景。實際設定路徑: " + selectedTexturePath);
    }

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

    function calculateTheoreticalExpectedDraws(itemProbabilities) {
        const n = itemProbabilities.length;
        const memo = new Map();
        function getE(collectedMask) {
            if (collectedMask === (1 << n) - 1) {
                return 0;
            }
            if (memo.has(collectedMask)) {
                return memo.get(collectedMask);
            }
            let probSumOfItemsNotYetCollected = 0;
            let expectedValueSumFromNextStates = 0;
            for (let i = 0; i < n; i++) {
                if (!((collectedMask >> i) & 1)) {
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
        return getE(0);
    }

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

    function playSound(soundElement) {
        if (soundElement) {
            soundElement.currentTime = 0;
            soundElement.play().catch(error => {
                console.warn("音效播放失敗 (可能是瀏覽器限制，請先與頁面互動):", error);
            });
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
            `;
            void resultDiv.offsetWidth;
            resultDiv.classList.add('fade-in');
            resultDiv.style.height = '';
            playSound(simCompleteSound);
        }, 50);
    });

    startAutoSimBtn.addEventListener('click', () => {
        const numSimulations = parseInt(simulationCountInput.value, 10);
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
        const theoreticalExpectedDraws = calculateTheoreticalExpectedDraws(probs);
        let allDraws = [];
        let totalDraws = 0;
        let minDraws = Infinity;
        let maxDraws = 0;
        let sumOfDuplicateProportions = 0;
        const numberOfUniqueItems = probs.length;
        function runSimulationBatch(currentIndex) {
            const batchSize = Math.min(50, numSimulations - currentIndex);
            for (let i = 0; i < batchSize; i++) {
                const draws = simulateOnce();
                allDraws.push(draws);
                totalDraws += draws;
                if (draws < minDraws) minDraws = draws;
                if (draws > maxDraws) maxDraws = draws;
                if (draws > 0) {
                    sumOfDuplicateProportions += (draws - numberOfUniqueItems) / draws;
                }
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
                displayAnalysisResults(
                    allDraws, totalDraws, minDraws, maxDraws, numSimulations,
                    theoreticalExpectedDraws,
                    sumOfDuplicateProportions
                );
                startAutoSimBtn.disabled = false;
                simBtn.disabled = false;
                progressTextElem.textContent = `模擬完成！ (${numSimulations}/${numSimulations})`;
            }
        }
        requestAnimationFrame(() => runSimulationBatch(0));
    });

    function displayAnalysisResults(
        allDraws, totalDraws, minDraws, maxDraws, numSimulations,
        theoreticalExpectedDraws,
        sumOfDuplicateProportions
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
        const theoreticalExpectedCost = theoreticalExpectedDraws * pricePerPack;
        const averageDuplicateRate = numSimulations > 0 ? sumOfDuplicateProportions / numSimulations : 0;
        let histogramHTML = '';
        if (numSimulations > 0 && allDraws.length > 0) {
            const bins = [
                { label: '6-10', min: 6, max: 10, count: 0 },
                { label: '11-15', min: 11, max: 15, count: 0 },
                { label: '16-20', min: 16, max: 20, count: 0 },
                { label: '21-25', min: 21, max: 25, count: 0 },
                { label: '26-30', min: 26, max: 30, count: 0 },
                { label: '31-40', min: 31, max: 40, count: 0 },
                { label: '41-50', min: 41, max: 50, count: 0 },
                { label: '51+', min: 51, max: Infinity, count: 0 }
            ];
            allDraws.forEach(drawCount => {
                for (const bin of bins) {
                    if (drawCount >= bin.min && drawCount <= bin.max) {
                        bin.count++;
                        break;
                    }
                }
            });
            const maxFreq = Math.max(...bins.map(bin => bin.count), 0);
            const chartBarAreaMaxHeightPx = 100;
            histogramHTML = '<div class="histogram-container">';
            let hasDataInBins = false;
            bins.forEach(bin => {
                if (bin.count > 0 || (maxDraws > 0 && bin.min <= maxDraws)) {
                    hasDataInBins = true;
                    const barPixelHeight = maxFreq > 0 ? Math.round((bin.count / maxFreq) * chartBarAreaMaxHeightPx) : 0;
                    histogramHTML += `
                        <div class="histogram-bar-group">
                            <div class="histogram-bar" style="height: ${barPixelHeight}px;" title="${bin.label}: ${bin.count} 次模擬"></div>
                            <div class="histogram-label">${bin.label}</div>
                            <div class="histogram-freq">${bin.count}次</div>
                        </div>
                    `;
                }
            });
            histogramHTML += '</div>';
            if (!hasDataInBins && allDraws.length > 0) {
                histogramHTML = '<div class="histogram-container"><p style="width:100%; text-align:center; color:#ccc; font-size:0.8em;">所有模擬結果均超出預設分組範圍，或數據過於分散。</p></div>';
            } else if (allDraws.length === 0) {
                 histogramHTML = '<div class="histogram-container"><p style="width:100%; text-align:center; color:#ccc; font-size:0.8em;">無有效模擬數據生成分佈圖。</p></div>';
            }
        } else {
            histogramHTML = '<div class="histogram-container"><p style="width:100%; text-align:center; color:#ccc; font-size:0.8em;">模擬次數不足，無法生成分佈圖。</p></div>';
        }
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
            <hr class="info-divider">
            <h4>抽獎次數分佈圖：</h4>
            ${histogramHTML}
            <hr class="info-divider">
            <p class="description" style="text-align:center;"><strong>提醒：</strong>以上為 ${numSimulations} 次模擬的統計結果，<br>實際運氣還是要看個人造化喔！祝您好運！</p>
        `;
        autoSimResultDiv.style.display = 'block';
        void autoSimResultDiv.offsetWidth;
        autoSimResultDiv.classList.add('fade-in');
        playSound(simCompleteSound);
    }

    // --- 版權聲明相關 DOM 元素獲取 ---
    const copyrightBtn = document.getElementById('copyrightBtn');
    const copyrightSection = document.getElementById('copyrightSection');
    const backToSimBtn = document.getElementById('backToSimBtn');
    const simulatorContainer = document.querySelector('.container');

    // --- 版權按鈕和返回按鈕的事件監聽 ---
    if (copyrightBtn && copyrightSection && backToSimBtn && simulatorContainer) {
        copyrightBtn.addEventListener('click', () => {
            simulatorContainer.style.display = 'none';
            copyrightSection.style.display = 'flex';
            setTimeout(() => { // 確保 display 生效後再加 class 以觸發 transition
                copyrightSection.classList.add('visible');
            }, 10); // 短暫延遲
        });

        backToSimBtn.addEventListener('click', () => {
            copyrightSection.classList.remove('visible');
            // CSS transition 會處理淡出效果, visibility 的 delay 會在其後生效
            // 不需要 JS 手動設定 display:none，除非不使用 visibility transition
            // 在 CSS transition 結束後 (0.3s), visibility 會變為 hidden

            simulatorContainer.style.display = 'block'; // 恢復模擬器主容器的顯示

            // 重置模擬器到初始選擇模式狀態
            if (modeSelectionDiv) modeSelectionDiv.style.display = 'block';
            if (manualSimSectionDiv) manualSimSectionDiv.style.display = 'none';
            if (autoSimSectionDiv) autoSimSectionDiv.style.display = 'none';

            if (selectManualBtn) selectManualBtn.classList.remove('active');
            if (selectAutoBtn) selectAutoBtn.classList.remove('active');

            if (resultDiv) {
                resultDiv.innerHTML = '<p>&nbsp;</p>';
                resultDiv.classList.remove('fade-in');
                resultDiv.style.opacity = '';
            }

            if (autoSimProgressDiv) autoSimProgressDiv.style.display = 'none';
            if (autoSimResultDiv) {
                autoSimResultDiv.style.display = 'none';
                autoSimResultDiv.classList.remove('fade-in');
            }
            
            if(startAutoSimBtn) startAutoSimBtn.disabled = false;
            if(simBtn) simBtn.disabled = false;
        });
    }
});
