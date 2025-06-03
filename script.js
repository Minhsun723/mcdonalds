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

    // --- 預設值與全域變數 ---
    const defaultItemNames = ['大鳥姊姊鞘翅', '漢堡神偷殭屍', '薯條頭盔', '奶昔大哥龍蛋', '蘇打藥水', '大麥克方塊'];
    const defaultProbs = [0.20, 0.20, 0.15, 0.15, 0.15, 0.15];
    const defaultPricePerPack = 200;

    let pricePerPack = defaultPricePerPack;
    let probs = [...defaultProbs]; // 使用展開運算符複製，避免直接引用
    let cumProbs = [];

    // --- DOM 元素獲取 (主要介面) ---
    const displayPricePerPackElem = document.getElementById('displayPricePerPack');
    const displayItemCountElem = document.getElementById('displayItemCount');
    const dynamicProbabilityListElem = document.getElementById('dynamicProbabilityList');

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

    // --- 設定選單相關 DOM 元素 ---
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsMenu = document.getElementById('settingsMenu');
    const unlimitedSimModeCheckbox = document.getElementById('unlimitedSimMode');
    const customModeCheckbox = document.getElementById('customMode');

    // --- 自訂義模式相關 DOM 元素 ---
    const customInputsArea = document.getElementById('customInputsArea');
    const customPriceInput = document.getElementById('customPrice');
    const customProbInputsContainer = document.getElementById('customProbInputsContainer');
    let customProbInputs = []; // 將由下方代碼填充
    const customProbSumFeedback = document.getElementById('customProbSumFeedback');
    const applyCustomSettingsBtn = document.getElementById('applyCustomSettingsBtn');
    const resetToDefaultSettingsBtn = document.getElementById('resetToDefaultSettingsBtn');

    // --- 版權聲明相關 DOM 元素 ---
    const copyrightBtn = document.getElementById('copyrightBtn');
    const copyrightSection = document.getElementById('copyrightSection');
    const backToSimBtn = document.getElementById('backToSimBtn');
    const simulatorContainer = document.querySelector('.container');


    // --- 核心計算函式 ---
    function calculateCumulativeProbs() {
        cumProbs = [];
        probs.reduce((sum, p) => {
            const newSum = sum + p;
            cumProbs.push(newSum);
            return newSum;
        }, 0);
        if (cumProbs.length > 0 && Math.abs(cumProbs[cumProbs.length - 1] - 1.0) > 1e-9) {
            console.warn("警告：目前累積機率總和不為 1，請檢查機率設定。目前總和:", cumProbs[cumProbs.length - 1]);
        }
    }

    function calculateTheoreticalExpectedDraws(itemProbabilities) {
        const n = itemProbabilities.length;
        if (n === 0) return 0; // 防止空陣列錯誤
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
                if (!((collectedMask >> i) & 1)) { // 如果第 i 個物品尚未收集
                    if(itemProbabilities[i] > 0) { // 只考慮機率大於0的物品
                        probSumOfItemsNotYetCollected += itemProbabilities[i];
                        expectedValueSumFromNextStates += itemProbabilities[i] * getE(collectedMask | (1 << i));
                    }
                }
            }
            if (probSumOfItemsNotYetCollected === 0) { // 如果所有未收集物品的機率都是0，無法繼續
                 // 這種情況理論上不應發生在Coupon Collector's Problem的標準設定中，除非物品機率可為0
                return Infinity; // 或者一個非常大的數，表示無法集齊
            }
            const result = (1 + expectedValueSumFromNextStates) / probSumOfItemsNotYetCollected;
            memo.set(collectedMask, result);
            return result;
        }
        const expectedDraws = getE(0);
        return isFinite(expectedDraws) ? expectedDraws : 0; // 如果結果是Infinity，返回0或提示
    }

    function simulateOnce() {
        const collected = new Set();
        let draws = 0;
        const numberOfTypes = probs.length;
        if (numberOfTypes === 0) return 0; // 如果沒有物品種類

        let safetyBreak = 0;
        const maxDraws = numberOfTypes * 300; // 安全上限

        // 檢查是否有至少一個物品的機率大於0
        const canCollectAnything = probs.some(p => p > 0);
        if (!canCollectAnything && numberOfTypes > 0) {
            console.error("所有物品的抽取機率均為0，無法進行模擬。");
            return maxDraws; // 或返回一個表示錯誤的值
        }
        
        while (collected.size < numberOfTypes && safetyBreak < maxDraws) {
            draws++;
            safetyBreak++;
            const r = Math.random();
            let foundItemThisDraw = false;
            for (let i = 0; i < cumProbs.length; i++) {
                if (r < cumProbs[i]) {
                    if (probs[i] > 0) { // 只將機率大於0的物品加入收集
                       collected.add(i);
                       foundItemThisDraw = true;
                    }
                    break; 
                }
            }
             if (!foundItemThisDraw && cumProbs.length > 0 && r >= cumProbs[cumProbs.length -1] && cumProbs[cumProbs.length -1] < 1) {
                // 這種情況可能發生在機率總和略小於1的浮點數誤差時，r 落入了最後的空隙
                // 或者，如果最後一個物品的機率為0，而 r 正好大於倒數第二個累積機率
                // 為確保模擬繼續，可以選擇隨機抽取一個已定義的物品，或標記為無效抽取 (但不增加draws?)
                // 一個簡單處理：如果r落在[最終累積機率, 1) 且最終累積機率<1，重新抽一次（不常用）
                // 或者，如果沒有抽到任何東西（例如所有剩餘物品機率為0），則跳出循環
                // 這裡的邏輯是，只要cumProbs是基於probs計算的，且probs總和為1，r < cumProbs[i]總會命中一個
            }
        }
        if (safetyBreak >= maxDraws && collected.size < numberOfTypes) {
            console.error(`模擬次數達到上限 (${maxDraws})，但仍未集齊所有種類 (${collected.size}/${numberOfTypes})。可能是部分物品機率為0導致。`);
        }
        return draws;
    }

    // --- UI 更新函式 ---
    function updateInfoBoxDisplay() {
        if (displayPricePerPackElem) {
            displayPricePerPackElem.textContent = `${pricePerPack} 元`;
        }
        if (displayItemCountElem) {
            displayItemCountElem.textContent = `${probs.length} 種`; // 假設項目數量等於 probs 陣列長度
        }

        if (dynamicProbabilityListElem) {
            dynamicProbabilityListElem.innerHTML = ''; // 清空舊列表
            probs.forEach((prob, index) => {
                const itemName = defaultItemNames[index] || `物品 ${index + 1}`;
                // 格式化百分比，如果是整數則不顯示小數，否則最多顯示2位，如果.0也算整數
                let percentageString;
                const percentageVal = prob * 100;
                if (percentageVal % 1 === 0) {
                    percentageString = percentageVal.toFixed(0);
                } else if (percentageVal * 10 % 1 === 0) {
                     percentageString = percentageVal.toFixed(1);
                } else {
                    percentageString = percentageVal.toFixed(2);
                }

                const listItem = document.createElement('li');
                listItem.innerHTML = `
                    <span class="item-name">${itemName}</span>
                    <span class="item-separator"></span>
                    <strong class="percentage">${percentageString}%</strong>
                `;
                dynamicProbabilityListElem.appendChild(listItem);
            });
        }
    }
    
    // --- 音效播放 ---
    function playSound(soundElement) {
        if (soundElement) {
            soundElement.currentTime = 0;
            soundElement.play().catch(error => {
                console.warn("音效播放失敗 (可能是瀏覽器限制，請先與頁面互動):", error);
            });
        }
    }

    // --- 模式選擇按鈕事件 ---
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
        resultDiv.innerHTML = '<p>&nbsp;</p>'; // 清除手動模擬結果
        resultDiv.classList.remove('fade-in');
        resultDiv.style.opacity = '';
        autoSimProgressDiv.style.display = 'none';
        progressBarElem.style.width = '0%';
        progressBarElem.textContent = '0%';
        progressTextElem.textContent = '模擬進行中...';
        autoSimResultDiv.style.display = 'none';
        autoSimResultDiv.classList.remove('fade-in');
    });

    // --- 手動模擬事件 ---
    simBtn.addEventListener('click', () => {
        const computedStyle = window.getComputedStyle(resultDiv);
        const currentHeight = computedStyle.height;
        resultDiv.style.height = currentHeight; // 固定高度防止跳動
        resultDiv.classList.remove('fade-in');
        autoSimResultDiv.style.display = 'none'; // 隱藏自動模擬結果
        autoSimResultDiv.classList.remove('fade-in');
        resultDiv.innerHTML = `<p>努力計算中...</p>`;
        setTimeout(() => {
            const trials = simulateOnce();
            const cost = trials * pricePerPack;
            resultDiv.innerHTML = `
                <p>這次總共抽了 <strong>${trials}</strong> 次，<br>
                共花費 <strong>${new Intl.NumberFormat('zh-TW').format(cost)}</strong> 元新台幣！</p>
            `;
            void resultDiv.offsetWidth; // 強制重繪
            resultDiv.classList.add('fade-in');
            resultDiv.style.height = ''; // 恢復自動高度
            playSound(simCompleteSound);
        }, 50);
    });

    // --- 自動模擬事件 ---
    startAutoSimBtn.addEventListener('click', () => {
        const numSimulations = parseInt(simulationCountInput.value, 10);
        const maxSimValue = unlimitedSimModeCheckbox.checked ? Infinity : 5000;

        if (isNaN(numSimulations) || numSimulations < 1 || (!unlimitedSimModeCheckbox.checked && numSimulations > maxSimValue) ) {
            alert(`請輸入有效的模擬次數 (1 到 ${unlimitedSimModeCheckbox.checked ? '合理的最大值' : '5000'} 之間)。`);
            simulationCountInput.focus();
            return;
        }
        startAutoSimBtn.disabled = true;
        simBtn.disabled = true; // 避免在自動模擬時進行手動模擬
        selectManualBtn.disabled = true; // 模式切換按鈕也禁用
        selectAutoBtn.disabled = true;
        settingsBtn.disabled = true; // 設定按鈕也禁用


        autoSimProgressDiv.style.display = 'block';
        autoSimResultDiv.style.display = 'none';
        autoSimResultDiv.classList.remove('fade-in');
        resultDiv.style.opacity = '0'; // 淡出手動模擬結果
        resultDiv.classList.remove('fade-in');
        
        const theoreticalExpectedDraws = calculateTheoreticalExpectedDraws(probs);
        let allDraws = [];
        let totalDraws = 0;
        let minDraws = Infinity;
        let maxDraws = 0;
        let sumOfDuplicateProportions = 0;
        const numberOfUniqueItems = probs.length;

        function runSimulationBatch(currentIndex) {
            const batchSize = Math.min(50, numSimulations - currentIndex); // 每批處理50次或剩餘次數
            for (let i = 0; i < batchSize; i++) {
                const draws = simulateOnce();
                allDraws.push(draws);
                totalDraws += draws;
                if (draws < minDraws) minDraws = draws;
                if (draws > maxDraws) maxDraws = draws;
                if (draws > 0 && numberOfUniqueItems > 0 && draws >= numberOfUniqueItems) { // 確保 draws 大於等於物品種類數
                    sumOfDuplicateProportions += (draws - numberOfUniqueItems) / draws;
                } else if (draws > 0 && numberOfUniqueItems > 0 && draws < numberOfUniqueItems) {
                    // 這種情況不應計算重複率，或者重複率為0
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
                selectManualBtn.disabled = false;
                selectAutoBtn.disabled = false;
                settingsBtn.disabled = false;
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
            // 動態調整分組或使用固定分組
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
             // 如果 probs.length (即 defaultItemNames.length) 不是6，則第一個 bin 的 min 應為 probs.length
            if (probs.length > 0) {
                bins[0].min = probs.length; // 至少要抽 probs.length 次
                bins[0].label = `${probs.length}-${Math.max(probs.length, 10)}`;
                 if(probs.length > 10) { // 如果種類本身就很多，調整第一個bin
                    bins[0].label = `${probs.length}-${probs.length+4}`;
                    bins[0].max = probs.length+4;
                 }
            }


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
                if (bin.count > 0 || (maxDraws > 0 && bin.min <= maxDraws && bin.max >= minDraws )) { // 只有在有數據或範圍相關時才顯示柱子
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
            <p>理論期望抽獎次數：<strong>${isFinite(theoreticalExpectedDraws) && theoreticalExpectedDraws > 0 ? theoreticalExpectedDraws.toFixed(2) : 'N/A (無法計算或機率設定問題)'}</strong> 次</p>
            <p>理論期望花費：<strong>${isFinite(theoreticalExpectedCost) && theoreticalExpectedCost > 0 ? new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(theoreticalExpectedCost) : 'N/A'}</strong></p>
            <p>模擬中，抽到重複品的平均機率：<strong>${(averageDuplicateRate * 100).toFixed(2)}%</strong></p>
            <hr class="info-divider">
            <h4>抽獎次數分佈圖：</h4>
            ${histogramHTML}
            <hr class="info-divider">
            <p class="description" style="text-align:center;"><strong>提醒：</strong>以上為 ${numSimulations} 次模擬的統計結果，<br>實際運氣還是要看個人造化喔！祝您好運！</p>
        `;
        autoSimResultDiv.style.display = 'block';
        void autoSimResultDiv.offsetWidth; // 強制重繪
        autoSimResultDiv.classList.add('fade-in');
        playSound(simCompleteSound);
        autoSimResultDiv.scrollIntoView({ behavior: 'smooth' });
    }

    // --- 版權聲明互動 ---
    if (copyrightBtn && copyrightSection && backToSimBtn && simulatorContainer) {
        copyrightBtn.addEventListener('click', () => {
            copyrightSection.style.display = 'flex';
            setTimeout(() => { 
                copyrightSection.classList.add('visible');
            }, 10); 
             if (settingsMenu.classList.contains('visible')) { // 如果設定選單是開的，則關閉它
                settingsMenu.classList.remove('visible');
            }
        });

        backToSimBtn.addEventListener('click', () => {
            copyrightSection.classList.remove('visible');
            // CSS transition 會處理淡出
        });
    }
    
    // --- 設定選單互動 ---
    if (settingsBtn && settingsMenu) {
        settingsBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            const isVisible = settingsMenu.classList.contains('visible');
            if (isVisible) {
                settingsMenu.classList.remove('visible');
            } else {
                settingsMenu.classList.add('visible');
                if (copyrightSection.classList.contains('visible')) { // 如果版權是開的，則關閉它
                    copyrightSection.classList.remove('visible');
                }
            }
        });
        settingsMenu.addEventListener('click', function(event) {
            event.stopPropagation(); // 防止點擊選單內部導致選單關閉
        });
    }
    window.addEventListener('click', function() { // 點擊頁面其他地方隱藏設定選單
        if (settingsMenu && settingsMenu.classList.contains('visible')) {
            settingsMenu.classList.remove('visible');
        }
    });

    // --- 無限制模擬模式勾選框邏輯 ---
    if (unlimitedSimModeCheckbox && simulationCountInput) {
        unlimitedSimModeCheckbox.addEventListener('change', function() {
            if (this.checked) {
                alert("無限制模擬模式已啟用。\n請注意：若輸入過大的模擬次數，可能會導致瀏覽器長時間運算甚至無回應，請謹慎斟酌輸入！");
                simulationCountInput.removeAttribute('max');
                console.log("無限制模擬模式已啟用，已移除模擬次數上限。");
            } else {
                simulationCountInput.setAttribute('max', '5000');
                if (parseInt(simulationCountInput.value) > 5000) {
                    simulationCountInput.value = "5000";
                }
                console.log("無限制模擬模式已停用，模擬次數上限恢復為 5000。");
            }
        });
    }

    // --- 自訂義模式勾選框與內部邏輯 ---
    function populateCustomInputs() {
        if (customPriceInput) customPriceInput.value = pricePerPack;
        customProbInputs.forEach((input, index) => {
            if (input && probs[index] !== undefined) {
                 const percentageVal = probs[index] * 100;
                 if (percentageVal % 1 === 0) {
                    input.value = percentageVal.toFixed(0);
                 } else {
                    input.value = percentageVal.toFixed(1); // 輸入框中最多顯示一位小數
                 }
            } else if (input) {
                input.value = 0; // 如果 probs 中沒有對應值，設為0
            }
        });
        updateCustomProbSumFeedback();
    }

    function updateCustomProbSumFeedback() {
        if (!customProbSumFeedback) return;
        let currentSum = 0;
        customProbInputs.forEach(input => {
            const val = parseFloat(input.value);
            if (!isNaN(val)) {
                currentSum += val;
            }
        });
        customProbSumFeedback.textContent = `總機率：${currentSum.toFixed(1)}%`; // 回饋中也最多一位小數
        if (Math.abs(currentSum - 100.0) > 0.05) { // 允許0.05的誤差範圍
            customProbSumFeedback.style.color = '#ff6b6b'; // 紅色警告
        } else {
            customProbSumFeedback.style.color = '#7ebf49'; // 綠色正常
        }
    }
    
    // 動態生成自訂機率輸入框
    if(customProbInputsContainer) {
        defaultItemNames.forEach((name, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('setting-item');
            itemDiv.style.marginBottom = '5px';
            
            const label = document.createElement('label');
            label.htmlFor = `customProb${index}`;
            label.textContent = `${name}：`;
            label.style.fontSize = '0.8em';
            label.style.flexBasis = '110px'; 
            label.style.overflow = 'hidden';
            label.style.textOverflow = 'ellipsis';
            label.style.whiteSpace = 'nowrap';

            const input = document.createElement('input');
            input.type = 'number';
            input.id = `customProb${index}`;
            input.classList.add('custom-input-field', 'prob-input');
            input.min = '0';
            input.max = '100';
            input.step = '0.1'; 
            input.style.width = '50px';
            input.style.fontSize = '0.75em';
            input.style.padding = '3px';
            input.addEventListener('input', updateCustomProbSumFeedback); // 即時更新總和

            const percentSpan = document.createElement('span');
            percentSpan.textContent = '%';
            percentSpan.style.fontSize = '0.8em';
            percentSpan.style.marginLeft = '3px';

            itemDiv.appendChild(label);
            itemDiv.appendChild(input);
            itemDiv.appendChild(percentSpan);
            customProbInputsContainer.appendChild(itemDiv);
            customProbInputs.push(input); // 添加到數組
        });
    }


    if (customModeCheckbox) {
        customModeCheckbox.addEventListener('change', function() {
            if (this.checked) {
                if (customInputsArea) customInputsArea.style.display = 'block';
                populateCustomInputs(); 
                console.log("自訂義模式已啟用");
            } else {
                if (customInputsArea) customInputsArea.style.display = 'none';

                // --- 當取消勾選自訂義模式時，恢復預設值 ---
                pricePerPack = defaultPricePerPack;
                probs = [...defaultProbs];
                
                calculateCumulativeProbs(); 
                updateInfoBoxDisplay();   
                
                // 更新自訂輸入框內的數值為預設值，以便下次啟用時顯示正確
                populateCustomInputs();
                
                console.log("自訂義模式已停用");
            }
        });
    }

    if (applyCustomSettingsBtn) {
        applyCustomSettingsBtn.addEventListener('click', function() {
            const newCustomPrice = parseInt(customPriceInput.value, 10);
            if (isNaN(newCustomPrice) || newCustomPrice < 0) {
                alert("請輸入有效的套餐單價（非負整數）。");
                customPriceInput.focus();
                return;
            }

            const newCustomProbsPercentages = customProbInputs.map(input => parseFloat(input.value));
            if (newCustomProbsPercentages.some(isNaN)) {
                alert("部分機率值無效，請檢查輸入。");
                return;
            }

            let probSumPercentage = newCustomProbsPercentages.reduce((sum, p) => sum + p, 0);
            if (Math.abs(probSumPercentage - 100.0) > 0.05) { // 允許0.05的誤差
                alert(`機率總和必須為 100%！目前總和為 ${probSumPercentage.toFixed(1)}%。請調整後再套用。`);
                return;
            }

            pricePerPack = newCustomPrice;
            probs = newCustomProbsPercentages.map(p => p / 100.0);
            
            calculateCumulativeProbs(); 
            updateInfoBoxDisplay();   
            
            alert("自訂設定已成功套用！");
            console.log("自訂設定已套用:", { pricePerPack, probs });
        });
    }

    if (resetToDefaultSettingsBtn) {
        resetToDefaultSettingsBtn.addEventListener('click', function() {
            pricePerPack = defaultPricePerPack;
            probs = [...defaultProbs];
            
            calculateCumulativeProbs();
            updateInfoBoxDisplay();
            
            if (customModeCheckbox.checked && customInputsArea && customInputsArea.style.display !== 'none') {
                populateCustomInputs(); 
            }
            alert("已恢復為預設設定！");
            console.log("已恢復預設設定:", { pricePerPack, probs });
        });
    }

    // --- 初始化 ---
    calculateCumulativeProbs(); // 根據初始 probs 計算累積機率
    updateInfoBoxDisplay();     // 更新主介面顯示初始價格與機率

});
