 let index = 0;
        let isPlaying = false;
        let currentBgm = null;
        // 打字機變數
        let typingTimer = null;
        let isTyping = false;
        let currentText = "";
        let audioCtx = null; // AudioContext for SFX
        let isSkipping = false; // 跳過模式狀態
        let gameMode = 'prologue'; // prologue, level-intro, level-editor, level-success
        let unlockedProgress = 99; // 測試模式：全解鎖
        let playerInventory = JSON.parse(localStorage.getItem('wonderland_inventory')) || [];
        let dragNodeSource = null; // 用於增強拖曳音效
        let globalBgmVolume = 0.6;
        let globalSfxVolume = 1.0;
        let dragGainNode = null;
        let dialogueHistory = []; // 新增：對話歷史紀錄
        let switches = [false, false]; // Stage 2 Logic Switches
        let pointerPos = 0; // Stage 3 Pointer
        let boxData = []; // Stage 3 Box Data
        let sanity = 100;
        let currentWave = 0; // Stage 7 Wave

  

       
        // 當前執行的劇本
        let currentScript = prologueScript;
        let currentLvl = 1;

        // --- 核心邏輯 ---

        function saveProgress(p) {
            if(p > unlockedProgress) {
                unlockedProgress = p;
                localStorage.setItem('wonderland_progress', unlockedProgress);
            }
        }

        // 新增：通用轉場函數
        function performTransition(callback) {
            const overlay = document.getElementById('flash-overlay');
            overlay.style.zIndex = 3000;
            overlay.style.background = "#000";
            overlay.style.transition = "opacity 1s ease-in-out";
            overlay.style.opacity = 1;
            
            setTimeout(() => {
                callback();
                setTimeout(() => {
                    overlay.style.opacity = 0;
                    setTimeout(() => { 
                        overlay.style.zIndex = 200; 
                        overlay.style.background = "white";
                    }, 800);
                }, 200);
            }, 1000);
        }

        function startGame() {
            performTransition(() => {
                // NEW GAME: 重置所有狀態
                playerInventory = [];
                unlockedProgress = 0; // 如果希望新遊戲不影響已解鎖章節，可註解此行；若希望完全重來則保留
                dialogueHistory = [];
                
                // 清除存檔 (可選，視需求而定)
                localStorage.removeItem('wonderland_inventory');
                // localStorage.removeItem('wonderland_progress'); // 通常保留章節解鎖狀態比較友善

                document.getElementById('start-screen').style.display = 'none';
                document.getElementById('dialogue-box').style.display = 'block';
                isPlaying = true;
                document.getElementById('bgm-crisis').volume = globalBgmVolume;
                document.getElementById('bgm-king').volume = globalBgmVolume;
                initAudio(); // 初始化音效引擎
                
                // 重置為序章
                loadPrologue();
            });
        }

        function nextScript() {
            if(!isPlaying) return;
            
            // 如果正在打字，直接顯示全部文字
            if(isTyping) {
                completeTyping();
                return;
            }

            index++;
            if(index >= currentScript.length) {
                // 劇本結束時的狀態切換
                if (gameMode === 'prologue') {
                    saveProgress(1); // 解鎖第一關
                    // 優化轉場：白光淡入淡出
                    const flash = document.getElementById('flash-overlay');
                    flash.style.transition = 'opacity 1s ease-in';
                    flash.style.opacity = 1;
                    
                    setTimeout(() => {
                        initStage1();
                        // 切換完畢後淡出
                        setTimeout(() => {
                            flash.style.transition = 'opacity 1.5s ease-out';
                            flash.style.opacity = 0;
                        }, 100);
                    }, 1000);
                    
                } else if (gameMode === 'level-intro') {
                    startPuzzle();
                } else if (gameMode === 'level-success') {
                    nextLevel();
                } else if (gameMode === 'stage2-intro') {
                    startPuzzle();
                } else if (gameMode === 'stage2-success') {
                    performTransition(() => {
                        saveProgress(3);
                        initStage3();
                    });
                } else if (gameMode === 'stage3-intro') {
                    setupStage3UI(currentLvl);
                } else if (gameMode === 'stage3-success') {
                    // 第三章結束，進入第四章
                    performTransition(() => {
                        saveProgress(4);
                        initStage4();
                    });
                } else if (gameMode === 'stage4-intro') {
                    setupStage4UI(currentLvl);
                } else if (gameMode === 'stage4-success') {
                    performTransition(() => {
                        saveProgress(5);
                        initStage5();
                    });
                } else if (gameMode === 'stage5-intro') {
                    setupStage5UI(currentLvl);
                } else if (gameMode === 'stage5-success') {
                    performTransition(() => {
                        saveProgress(6);
                        initStage6();
                    });
                } else if (gameMode === 'stage6-intro') {
                    startMiniGame();
                } else if (gameMode === 'stage6-success') {
                    showModal("CHAPTER COMPLETE", "第六章結束。", () => openSystemMenu());
                } else if (gameMode === 'stage7-intro') {
                    startStage7Game();
                } else if (gameMode === 'stage7-success') {
                    showModal("CHAPTER COMPLETE", "第七章結束。", () => openSystemMenu());
                }
                return;
            }
            updateGame();
        }

        function updateGame() {
            const step = currentScript[index];
            
            // 特殊事件：獲得神器
            if(step.n === "神器") {
                let name = "未知神器";
                let desc = "無描述";
                let img = "";
                let filter = "";

                if(step.t.includes("懷錶發條")) {
                    name = "懷錶發條";
                    desc = "控制「順序」的權限模組。<br>沒有它，程式的時間將永遠停滯。";
                    img = "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%B8%80%E7%AB%A0/%E7%99%BC%E6%A2%9D%E6%87%B7%E9%8C%B6.png";
                } else if (step.t.includes("雙子櫻桃")) {
                    name = "雙子櫻桃";
                    desc = "【外觀描述】 一對晶瑩剔透的櫻桃，連接著同一根蒂頭。左邊是鮮紅的 TRUE，右邊是深藍的 FALSE。表面流動著二進制的微光。<br><br>【功能權限】<br><br>解鎖能力：Logic Switch (邏輯切換)<br><br>權限等級：User (使用者)<br><br>效果：強制反轉目標的布林值 (Boolean) 狀態。<br><br>【備註】 「真與假往往是一體兩面。就像這對櫻桃，酸甜共生。」 —— 喬諾娜";
                    img = "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%BA%8C%E7%AB%A0/%E9%9B%99%E5%AD%90%E6%AB%BB%E6%A1%83.png";
                    filter = "drop-shadow(0 0 20px rgba(255,255,255,0.8))";
                } else if (step.t.includes("商人的虛空箱")) {
                    name = "商人的虛空箱";
                    desc = "【外觀描述】 一個看似普通的木箱，但內部空間似乎連接著另一個維度。箱子上刻著浮動的索引數字 [0, 1, 2...]。<br><br>【功能權限】<br><br>解鎖能力：Array Storage (陣列儲存)<br><br>權限等級：User (使用者)<br><br>效果：能以陣列形式儲存無限物品，並透過索引 (Index) 隨取隨用。<br><br>【備註】 「兄弟，這可是好東西！只要你記得東西放在第幾格。」 —— 小目";
                    img = "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%B8%89%E7%AB%A0/%E5%95%86%E4%BA%BA%E7%9A%84%E8%99%9B%E7%A9%BA%E7%AE%B1.png";
                    filter = "drop-shadow(0 0 20px var(--primary))";
                } else if (step.t.includes("幻影標籤機")) {
                    name = "幻影標籤機";
                    desc = "【外觀描述】 一台精密的黃銅儀器，鏡頭散發著紫色的光芒。能掃描物件的底層代碼。<br><br>【功能權限】<br><br>解鎖能力：Property Inspector (屬性檢視)<br><br>權限等級：Admin (管理員)<br><br>效果：檢視並修改物件的屬性標籤 (Properties)。將不可能化為可能。<br><br>【備註】 「希望能幫這孩子快點出來，他叫得嗓子都啞了。」 —— 茉莉";
                    img = "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E5%9B%9B%E7%AB%A0/%E5%B9%BB%E5%BD%B1%E6%A8%99%E7%B1%A4%E6%A9%9F.png";
                    filter = "drop-shadow(0 0 20px var(--primary))";
                } else if (step.t.includes("黃金天平")) {
                    name = "黃金天平";
                    desc = "【外觀描述】 一個純金打造的天平，但兩端秤盤上放的不是砝碼，而是發光的代碼塊。指針永遠指向「邏輯正確」的一方。<br><br>【功能權限】<br><br>解鎖能力：Conditional Logic (條件判斷)<br><br>權限等級：Admin (管理員)<br><br>效果：掌控 IF/ELSE 的絕對權限，決定數據的流向與命運。<br><br>【備註】 「收好它。別像蜜拉思那樣把它當玩具。這是『邏輯』的重量。」 —— 奧拉";
                    img = "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%BA%94%E7%AB%A0/GLD.png";
                    filter = "drop-shadow(0 0 20px var(--primary))";
                } else if (step.t.includes("無限續杯茶壺")) {
                    name = "無限續杯茶壺";
                    desc = "【外觀描述】 一個永遠倒不完的茶壺，裡面裝著能讓程式無限運行的液體代碼。<br><br>【功能權限】<br><br>解鎖能力：Loop Control (迴圈控制)<br><br>權限等級：User (使用者)<br><br>效果：控制重複執行的次數與條件。<br><br>【備註】 「這份是... 強制喚醒的補償。請收下。」 —— 蘇郎";
                    img = "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E5%85%AD%E7%AB%A0/%E8%8C%B6%E6%9D%AF.png";
                    filter = "drop-shadow(0 0 20px var(--lilith-color))";
                } else if (step.t.includes("皇家油漆刷")) {
                    name = "皇家油漆刷 (Function)";
                    desc = "【外觀描述】 一支柄身雕刻著繁複藤蔓與「{ }」括號圖騰的黃金畫筆。刷毛沾滿了名為「真理」的鮮紅材質，揮動時會噴灑出代碼粒子，並在空中自動留下閉合的函數定義軌跡。<br><br>【功能權限】<br><br>解鎖能力： Function Packaging (函數封裝)<br><br>權限等級： Architect (架構師)<br><br>效果： 將複數個繁瑣的操作步驟打包為模組，並將其定義為可無限重複呼叫的單一指令。<br><br>【備註】 「沾漆、瞄準、塗抹……太慢了！太不吉利了！與其重複勞動一千次，不如定義一個函數一鍵搞定。皇家的效率，從封裝開始。」 —— 彼得";
                    img = "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%B8%83%E7%AB%A0/%E6%B2%B9%E6%BC%86%E5%88%B7.png";
                    filter = "drop-shadow(0 0 20px var(--primary))";
                }

                const imgEl = document.querySelector('#artifact-overlay .artifact-img');
                imgEl.src = img;
                imgEl.style.filter = filter || "drop-shadow(0 0 30px var(--primary))";

                document.querySelector('#artifact-overlay .artifact-title').innerText = "GET: " + name;
                document.querySelector('#artifact-overlay .artifact-desc').innerHTML = desc;
                
                const overlay = document.getElementById('artifact-overlay');
                overlay.style.display = 'flex';
                overlay.style.animation = 'fadeIn 1s';
                overlay.style.background = "rgba(0,0,0,0.98)";

                document.getElementById('sfx-item-get').play();
                // 加入背包
                if (!playerInventory.includes(name)) {
                    playerInventory.push(name);
                    localStorage.setItem('wonderland_inventory', JSON.stringify(playerInventory));
                }
                // 暫時隱藏對話框
                document.getElementById('dialogue-box').style.display = 'none';
                return; 
            }
            
            // 1. 文字更新
            document.getElementById('d-name').innerText = step.n;
            startTyping(step.t);
            
            // 儲存對話紀錄
            if (step.n !== "系統" && step.n !== "神器") {
                dialogueHistory.push({ name: step.n, text: step.t });
            }

            // V7: 名字標籤顏色 (修正版)
            const nameMap = {
                '哈蘇': '#e0e0e0', 
                '維納托': '#00008b', /* 深藍 */
                '納希瑟斯': '#800080', /* 紫 */
                '克里昂': '#ff4500', /* 紅橙色 */
                '系統': '#d4af37',
                '喬諾娜': '#ff9ff3',
                '諾郎': '#54a0ff',
                '奧拉': '#74b9ff',
                '小目': '#fab1a0',
                '茉莉': '#E89EB9',
                '蘭蘭': '#2ecc71',
                '蜜拉思': '#915CBD',
                '莉莉絲': '#bd93f9',
                '阿朵菈': '#ffb8c1',
                '蘇郎': '#8be9fd'
            };
            const color = nameMap[step.n] || '#d4af37';
            // 設定 CSS 變數，讓樣式表使用
            document.querySelector('.name-tag').style.setProperty('--char-color', color);


            // 2. 背景切換
            if(step.bg) {
                document.querySelectorAll('.bg-layer').forEach(bg => bg.style.opacity = 0);
                document.getElementById(step.bg).style.opacity = 1;
            }

            // 3. 音樂切換
            if(step.music) fadeMusic(step.music);

            // 4. 角色管理
            // 優化：只在 step.chars 存在時更新，且不強制重置所有角色以避免閃爍
            if (step.chars) {
                // 建立目標狀態 Map
                const targetState = {};
                step.chars.forEach(c => targetState[c.id] = c);

                document.querySelectorAll('.char-img').forEach(img => {
                    // 移除一次性動畫 class
                    img.classList.remove('anim-teleport', 'anim-fall');

                    if (targetState[img.id]) {
                        // 如果在目標列表中，直接設定 class (避免先 remove 造成的閃爍)
                        const info = targetState[img.id];
                        img.className = `char-img ${info.pos} ${info.state}`;
                        img.style.opacity = 1;
                        img.style.display = 'block'; // 確保被隱藏的角色能重新顯示

                        // 表情切換邏輯
                        if (info.face && charAssets[img.id] && charAssets[img.id][info.face]) {
                            img.src = charAssets[img.id][info.face];
                        } else if (charAssets[img.id] && charAssets[img.id]['default']) {
                            img.src = charAssets[img.id]['default'];
                        }
                    } else {
                        // 不在目標列表中，隱藏
                        img.style.opacity = 0;
                        // FIX: 保留位置 class (pos-*) 避免淡出時瞬移到中間
                        img.classList.remove('active', 'dim');
                    }
                });
            }

            // 5. 特效處理
            if (step.effect === 'teleport') {
                const flash = document.getElementById('flash-overlay');
                flash.style.animation = 'none';
                flash.offsetHeight; 
                flash.style.animation = 'flashAnim 0.5s forwards';
                document.getElementById('sfx-teleport').play();
                
                const activeChar = document.querySelector('.char-img.active');
                if(activeChar) activeChar.classList.add('anim-teleport');
            } else if (step.effect === 'fall') {
                const activeChar = document.querySelector('.char-img.active');
                document.getElementById('sfx-fall').play();
                if(activeChar) activeChar.classList.add('anim-fall');
            }
        }

        function fadeMusic(newBgmId) {
            const newBgm = document.getElementById('bgm-' + newBgmId);
            if (currentBgm === newBgm) return;

            if (currentBgm) {
                let fadeOut = setInterval(() => {
                    if (currentBgm.volume > 0.1) currentBgm.volume -= 0.1;
                    else {
                        clearInterval(fadeOut);
                        currentBgm.pause();
                        currentBgm.currentTime = 0;
                        currentBgm.volume = globalBgmVolume;
                        playNewBgm(newBgm);
                    }
                }, 100);
            } else {
                playNewBgm(newBgm);
            }
        }

        function playNewBgm(newBgm) {
            newBgm.volume = globalBgmVolume;
            newBgm.play().catch(e => console.log("BGM Play Error:", e));
            currentBgm = newBgm;
        }

        // --- 音效系統 ---
        function initAudio() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (audioCtx.state === 'suspended') {
                audioCtx.resume();
            }
            
            // 初始化拖曳音效增強 (Boost Volume)
            if (!dragNodeSource) {
                try {
                    const dragAudio = document.getElementById('sfx-drag');
                    dragNodeSource = audioCtx.createMediaElementSource(dragAudio);
                    const gainNode = audioCtx.createGain();
                    gainNode.gain.value = 3.0 * globalSfxVolume; // 3倍音量 * 設定值
                    dragNodeSource.connect(gainNode).connect(audioCtx.destination);
                    dragGainNode = gainNode;
                } catch(e) { console.log("Audio routing error:", e); }
            }
        }

        function playTypeSound() {
            if (!audioCtx) return;
            const t = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            
            // 輕微的打字機滴答聲
            osc.type = 'square';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(100, t + 0.03);
            
            gain.gain.setValueAtTime(0.1 * globalSfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
            
            osc.start(t); osc.stop(t + 0.03);
        }

        function playClickSound() {
            initAudio();
            if (!audioCtx) return;
            const t = audioCtx.currentTime;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain); gain.connect(audioCtx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(600, t);
            gain.gain.setValueAtTime(0.5 * globalSfxVolume, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
            osc.start(t);
            osc.stop(t + 0.05);
        }

        function playStage2ClickSound() {
            initAudio();
            const sfx = document.getElementById('sfx-drag');
            if (sfx) {
                sfx.currentTime = 0;
                sfx.play().catch(e => console.log(e));
            }
        }

        // --- 打字機效果函數 ---
        function startTyping(text) {
            const textBox = document.getElementById('d-text');
            textBox.innerText = "";
            currentText = text;
            isTyping = true;
            
            // 如果處於跳過模式，直接顯示並結束
            if(isSkipping) {
                textBox.innerText = text;
                isTyping = false;
                return;
            }

            let i = 0;
            if(typingTimer) clearInterval(typingTimer);
            
            typingTimer = setInterval(() => {
                textBox.innerText += text.charAt(i);
                i++;
                if (i % 2 === 0) playTypeSound(); // 每兩個字播放一次音效，避免太吵
                if(i >= text.length) completeTyping();
            }, 30); // 打字速度 (ms)
        }

        function completeTyping() {
            clearInterval(typingTimer);
            document.getElementById('d-text').innerText = currentText;
            isTyping = false;
        }



        