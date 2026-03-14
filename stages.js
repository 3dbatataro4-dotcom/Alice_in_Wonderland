        // --- 第一章邏輯 (Stage 1 Logic) ---

        function loadPrologue() {
            gameMode = 'prologue';
            currentScript = prologueScript;
            index = 0;
            
            // 清理第一章的 UI
            document.getElementById('btn-vision').style.display = 'none';
            document.getElementById('code-editor').classList.remove('open');
            document.getElementById('error-msg').style.display = 'none';
            document.getElementById('logic-panel').classList.remove('open');
            document.getElementById('stage3-game-area').style.display = 'none';
            document.getElementById('success-msg').style.display = 'none';
            document.getElementById('level-title').style.display = 'none';
            
            // 確保小遊戲介面完全關閉 (防止卡在畫面上)
            document.getElementById('code-editor').classList.remove('open');
            
            updateGame();
        }

        function initStage1() {
            gameMode = 'level-intro';
            fadeMusic('stage1'); // 切換到第一章音樂
            loadLevel(1);
        }

        function loadLevel(lv) {
            currentLvl = lv;
            const data = levels[lv];

            // UI 重置
            document.getElementById('file-name').innerText = data.file;
            document.getElementById('btn-vision').style.display = 'none';
            document.getElementById('error-msg').style.display = 'block';
            document.getElementById('success-msg').style.display = 'none';
            
            // 確保編輯器關閉
            document.getElementById('code-editor').classList.remove('open');
            document.getElementById('logic-panel').classList.remove('open');
            document.getElementById('stage3-game-area').style.display = 'none';
            document.getElementById('level-title').innerText = data.title;
            document.getElementById('level-title').style.display = 'block';
            
            // 設定章節標題顏色 (第一章：金色)
            const badge = document.getElementById('level-title');
            badge.style.color = 'var(--primary)';
            badge.style.borderLeftColor = 'var(--accent)';

            // 背景切換
            if (lv === 1) {
                document.querySelectorAll('.bg-layer').forEach(bg => bg.style.opacity = 0);
                document.getElementById('bg-door-closed').style.opacity = 1;
            }

            // 重置按鈕
            const runBtn = document.getElementById('run-btn');
            runBtn.disabled = false;
            runBtn.innerText = "▶ RUN SEQUENCE";
            runBtn.style.background = "var(--accent)";

            // 生成指令塊
            const list = document.getElementById('code-list');
            list.innerHTML = '';
            data.blocks.forEach(b => {
                const div = document.createElement('div');
                div.className = 'code-block';
                div.innerText = b.text;
                div.dataset.id = b.id;
                div.dataset.type = b.type;
                div.dataset.order = b.order || 99;
                div.dataset.msg = b.msg || "";
                initDrag(div); // 綁定拖曳
                list.appendChild(div);
            });

            // 開始關卡前導劇情
            currentScript = data.intro;
            index = -1;
            nextScript();
        }

        // --- 小遊戲啟動邏輯 ---
        function startPuzzle() {
            document.getElementById('dialogue-box').style.display = 'none';
            
            if (gameMode === 'level-intro') {
                gameMode = 'level-editor';
                document.getElementById('btn-vision').style.display = 'flex';
                openEditor();
            } else if (gameMode === 'stage2-intro') {
                setupStage2UI(currentLvl);
            } else if (gameMode === 'stage3-intro') {
                setupStage3UI(currentLvl);
            }
        }

        function nextLevel() {
            if(currentLvl < 3) {
                saveProgress(currentLvl + 1); // 解鎖下一關
                gameMode = 'level-intro';
                loadLevel(currentLvl + 1);
            } else if (gameMode === 'level-success' && currentLvl === 3) {
                // 第一章結束，進入第二章
                performTransition(() => {
                    saveProgress(2); // 假設2代表第二章解鎖
                    initStage2();
                });
            } else if (gameMode === 'stage2-success') {
                // 第二章結束，進入第三章
                performTransition(() => {
                    saveProgress(3);
                    initStage3();
                });
            } else {
                showModal("THE END", "感謝遊玩！第一章結束。", () => openSystemMenu());
            }
        }

        function closeArtifact() {
            document.getElementById('artifact-overlay').style.display = 'none';
            document.getElementById('dialogue-box').style.display = 'block';
            nextScript(); // 繼續劇本
        }

        // --- 編輯器與執行 ---
        function openEditor() { document.getElementById('code-editor').classList.add('open'); }
        function closeEditor() { document.getElementById('code-editor').classList.remove('open'); }

        async function runSequence() {
            const list = document.getElementById('code-list');
            const blocks = Array.from(list.children);
            const targetLength = levels[currentLvl].solutionLength;
            const runBtn = document.getElementById('run-btn');
            
            runBtn.disabled = true;
            runBtn.innerText = "RUNNING...";

            // 重置狀態
            blocks.forEach(b => b.classList.remove('running', 'success', 'error', 'ignored'));

            let correctCount = 0;

            for (let i = 0; i < blocks.length; i++) {
                const block = blocks[i];
                block.classList.add('running');
                
                await new Promise(r => setTimeout(r, 600)); 

                if (correctCount >= targetLength) {
                    block.classList.remove('running');
                    block.classList.add('ignored');
                    continue;
                }

                const requiredOrder = i + 1;
                const blockOrder = parseInt(block.dataset.order);

                if (block.dataset.type === 'trap') {
                    block.classList.remove('running');
                    block.classList.add('error');
                    showModal("SYSTEM WARNING", block.dataset.msg, () => failRun(runBtn));
                    return;
                }

                if (blockOrder === requiredOrder) {
                    block.classList.remove('running');
                    block.classList.add('success');
                    correctCount++;
                } else {
                    block.classList.remove('running');
                    block.classList.add('error');
                    showModal("EXECUTION ERROR", "執行錯誤：順序不對！", () => failRun(runBtn));
                    return;
                }
            }

            if (correctCount >= targetLength) {
                // 成功
                document.getElementById('sfx-success').play();
                saveProgress(currentLvl + 1); // 確保通關後解鎖下一關
                runBtn.style.background = "#00ff41";
                runBtn.innerText = "SUCCESS!";
                document.getElementById('error-msg').style.display = 'none';
                document.getElementById('success-msg').style.display = 'block';

                setTimeout(() => {
                    closeEditor();
                    
                    // 背景切換 (如果是第一關)
                    if (currentLvl === 1) {
                        document.getElementById('bg-door-closed').style.opacity = 0;
                        document.getElementById('bg-hallway').style.opacity = 1;
                    }
                    
                    // 背景切換 (如果是第三關)
                    if (currentLvl === 3) {
                        document.querySelectorAll('.bg-layer').forEach(bg => bg.style.opacity = 0);
                        document.getElementById('bg-final-gate').style.opacity = 1;
                    }

                    // 進入成功劇情
                    gameMode = 'level-success';
                    currentScript = levels[currentLvl].success;
                    index = -1;
                    document.getElementById('dialogue-box').style.display = 'block';
                    nextScript();

                }, 1000);
            } else {
                failRun(runBtn);
            }
        }

        function failRun(btn) {
            btn.innerText = "FAILED - RETRY";
            btn.style.background = "#ff4757";
            setTimeout(() => {
                btn.innerText = "▶ RUN SEQUENCE";
                btn.style.background = "var(--accent)";
                btn.disabled = false;
            }, 1500);
        }

        // --- 拖曳系統 ---
        let dragSrcEl = null;
        let dragMirror = null;

        function initDrag(el) {
            el.addEventListener('mousedown', dragStart);
            el.addEventListener('touchstart', dragStart, {passive: false});
        }

        function dragStart(e) {
            if(document.getElementById('run-btn').disabled) return;
            const target = e.target.closest('.code-block');
            if(!target) return;
            document.getElementById('sfx-drag').play();
            
            dragSrcEl = target;
            const touch = e.touches ? e.touches[0] : e;
            const rect = dragSrcEl.getBoundingClientRect();
            
            dragMirror = dragSrcEl.cloneNode(true);
            dragMirror.classList.add('code-block'); // 確保樣式一致
            dragMirror.style.position = "fixed";
            dragMirror.style.zIndex = 9999;
            dragMirror.style.width = rect.width + 'px';
            dragMirror.style.opacity = 0.9;
            dragMirror.style.transform = "rotate(3deg) scale(1.05)";
            dragMirror.style.left = rect.left + 'px';
            dragMirror.style.top = rect.top + 'px';
            document.body.appendChild(dragMirror);

            dragSrcEl.classList.add('dragging');

            document.addEventListener('mousemove', dragMove);
            document.addEventListener('touchmove', dragMove, {passive: false});
            document.addEventListener('mouseup', dragEnd);
            document.addEventListener('touchend', dragEnd);
        }

        function dragMove(e) {
            e.preventDefault();
            if(!dragMirror) return;
            const touch = e.touches ? e.touches[0] : e;
            dragMirror.style.top = (touch.clientY - 25) + 'px';
            dragMirror.style.left = (touch.clientX - 25) + 'px';

            const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
            const swapTarget = elements.find(el => el.classList.contains('code-block') && el !== dragSrcEl && el !== dragMirror);

            if(swapTarget) {
                const parent = dragSrcEl.parentNode;
                const srcIndex = Array.from(parent.children).indexOf(dragSrcEl);
                const targetIndex = Array.from(parent.children).indexOf(swapTarget);
                if(srcIndex < targetIndex) parent.insertBefore(dragSrcEl, swapTarget.nextSibling);
                else parent.insertBefore(dragSrcEl, swapTarget);
            }
        }

        function dragEnd(e) {
            if(dragSrcEl) dragSrcEl.classList.remove('dragging');
            if(dragMirror) dragMirror.remove();
            dragSrcEl = null; dragMirror = null;
            document.removeEventListener('mousemove', dragMove);
            document.removeEventListener('touchmove', dragMove);
            document.removeEventListener('mouseup', dragEnd);
            document.removeEventListener('touchend', dragEnd);
        }

        // --- 全局點擊特效 ---
        document.addEventListener('click', (e) => {
            const fx = document.createElement('div');
            fx.className = 'click-effect';
            fx.style.left = e.clientX + 'px';
            fx.style.top = e.clientY + 'px';
            document.body.appendChild(fx);
            setTimeout(() => fx.remove(), 400);
        });

        // --- 跳過功能 ---
        function toggleSkip() {
            isSkipping = !isSkipping;
            const btn = document.getElementById('skip-btn');
            
            if(isSkipping) {
                btn.classList.add('active');
                btn.innerText = "SKIPPING...";
                skipLoop();
            } else {
                btn.classList.remove('active');
                btn.innerText = "SKIP >>";
            }
        }

        function skipLoop() {
            if(!isSkipping || !isPlaying) {
                if(isSkipping) toggleSkip(); // 確保狀態同步關閉
                return;
            }
            
            // 執行下一句
            nextScript();
            
            // 如果還沒結束，繼續排程
            if(index < currentScript.length) {
                setTimeout(skipLoop, 100); // 100ms 極速播放
            } else {
                toggleSkip(); // 結束時關閉跳過
            }
        }

        // --- 第二章邏輯 (Stage 2 Logic) ---
        function initStage2() {
            gameMode = 'stage2-intro';
            fadeMusic('stage2');
            
            // 背景切換
            document.querySelectorAll('.bg-layer').forEach(bg => bg.style.opacity = 0);
            document.getElementById('bg-stage2').style.opacity = 1;
            
            loadStage2Level(1);
        }

        function loadStage2Level(lv) {
            currentLvl = lv;
            const data = stage2Levels[lv];
            
            // 背景濾鏡變化 (2-1:正常, 2-2:泛紅, 2-3:變暗)
            const bg = document.getElementById('bg-stage2');
            if (lv === 1) {
                bg.style.filter = "blur(2px) brightness(0.6)"; 
            } else if (lv === 2) {
                bg.style.filter = "blur(2px) sepia(0.4) hue-rotate(-50deg) saturate(1.5) brightness(0.9)";
            } else if (lv === 3) {
                bg.style.filter = "blur(2px) brightness(0.4) contrast(1.2)";
            }

            document.getElementById('level-title').innerText = data.title;
            document.getElementById('level-title').style.display = 'block';
            document.getElementById('logic-panel').classList.remove('open');
            document.getElementById('circuit-visual').style.opacity = (lv===3) ? 1 : 0;
            
            // 設定章節標題顏色 (第二章：粉色/藍色)
            const badge = document.getElementById('level-title');
            badge.style.color = 'var(--jonona-color)';
            badge.style.borderLeftColor = 'var(--nolang-color)';
            
            // 隱藏第一章的 UI
            document.getElementById('btn-vision').style.display = 'none';
            document.getElementById('code-editor').classList.remove('open');
            document.getElementById('error-msg').style.display = 'none';
            document.getElementById('stage3-game-area').style.display = 'none';

            currentScript = data.intro;
            index = -1;
            document.getElementById('dialogue-box').style.display = 'block';
            nextScript();
        }

        function setupStage2UI(lv) {
            const area = document.getElementById('game-area');
            area.innerHTML = '';
            document.getElementById('logic-panel').classList.add('open');

            if (lv === 1) {
                area.innerHTML = `
                    <div class="choice-btn" id="btn-j" onclick="selectIdentity('j')">
                        喬諾娜 (紅) <span>點擊切換: 未定</span>
                    </div>
                    <div class="choice-btn" id="btn-n" onclick="selectIdentity('n')">
                        諾郎 (藍) <span>點擊切換: 未定</span>
                    </div>
                `;
            } else if (lv === 2) {
                area.innerHTML = `
                    <div class="switch-row">
                        <span class="switch-label" style="color:var(--nolang-color)">諾郎的邏輯 (FALSE)</span>
                        <div class="tech-switch" onclick="toggleSwitch(this, 1)"></div>
                    </div>
                    <div style="color:#aaa; font-size:12px; margin-top:5px;">* 開啟開關以執行 NOT 運算</div>
                `;
                switches = [false, false];
            } else if (lv === 3) {
                area.innerHTML = `
                    <div class="switch-row">
                        <span class="switch-label" style="color:var(--jonona-color)">喬諾娜 (TRUE)</span>
                        <div class="tech-switch active" onclick="toggleSwitch(this, 0)"></div>
                        <span class="wire-status status-on" id="st-0">TRUE</span>
                    </div>
                    <div class="switch-row">
                        <span class="switch-label" style="color:var(--nolang-color)">諾郎 (FALSE)</span>
                        <div class="tech-switch" onclick="toggleSwitch(this, 1)"></div>
                        <span class="wire-status status-off" id="st-1">FALSE</span>
                    </div>
                    <div style="text-align:center; color:#fff; margin-top:10px;">
                        TARGET: TRUE + TRUE = OPEN
                    </div>
                `;
                switches = [true, false]; 
                updateVisuals();
            }
        }

        function selectIdentity(target) {
            playStage2ClickSound();
            const btn = document.getElementById(target === 'j' ? 'btn-j' : 'btn-n');
            const current = btn.getAttribute('data-val');
            let nextVal = 'TRUE';
            let nextText = 'TRUE (真)';
            let color = 'var(--true-col)';
            
            if(current === 'TRUE') { nextVal = 'FALSE'; nextText = 'FALSE (假)'; color = 'var(--false-col)'; }
            else if(current === 'FALSE') { nextVal = null; nextText = '未定'; color = '#888'; }
            
            btn.setAttribute('data-val', nextVal);
            btn.querySelector('span').innerText = nextText;
            btn.style.borderColor = color;
        }

        function toggleSwitch(el, idx) {
            playStage2ClickSound();
            el.classList.toggle('active');
            switches[idx] = el.classList.contains('active');
            if(currentLvl === 3) updateVisuals();
        }

        function updateVisuals() {
            if(document.getElementById('st-0')) {
                const s0 = switches[0];
                const st0 = document.getElementById('st-0');
                st0.innerText = s0 ? "TRUE" : "FALSE";
                st0.className = s0 ? "wire-status status-on" : "wire-status status-off";
            }
            if(document.getElementById('st-1')) {
                const s1 = switches[1]; 
                const st1 = document.getElementById('st-1');
                st1.innerText = s1 ? "TRUE" : "FALSE";
                st1.className = s1 ? "wire-status status-on" : "wire-status status-off";
            }

            if(currentLvl === 3) {
                const isOpne = switches[0] && switches[1];
                const gate = document.getElementById('gate-output');
                gate.innerText = isOpne ? "OPEN" : "LOCKED";
                gate.style.color = isOpne ? "var(--true-col)" : "#555";
                gate.style.textShadow = isOpne ? "0 0 20px var(--true-col)" : "none";
            }
        }

        function checkAnswer() {
            if(currentLvl === 1) {
                const j = document.getElementById('btn-j').getAttribute('data-val');
                const n = document.getElementById('btn-n').getAttribute('data-val');
                if(j === 'TRUE' && n === 'FALSE') {
                    document.getElementById('sfx-success').play();
                    showModal("ACCESS GRANTED", "身分確認正確！", () => loadStage2Level(2));
                } else {
                    showModal("ACCESS DENIED", "判斷錯誤。請回想他們的自我介紹。");
                }
            } else if (currentLvl === 2) {
                if(switches[1]) {
                    document.getElementById('sfx-success').play();
                    showModal("LOGIC INVERTED", "邏輯反轉成功！", () => loadStage2Level(3));
                } else {
                    showModal("ERROR", "諾郎還是 FALSE。請打開開關！");
                }
            } else if (currentLvl === 3) {
                if(switches[0] && switches[1]) {
                    document.getElementById('sfx-success').play();
                    
                    // 切換背景為開啟的大門
                    document.querySelectorAll('.bg-layer').forEach(bg => bg.style.opacity = 0);
                    document.getElementById('bg-stage2-open').style.opacity = 1;

                    document.getElementById('logic-panel').classList.remove('open');
                    startStage2Ending();
                } else {
                    showModal("GATE LOCKED", "門還鎖著。需要兩個 TRUE。");
                }
            }
        }

        function startStage2Ending() {
            gameMode = 'stage2-success'; // 防止迴圈 Bug
            const endScript = [
                { n: "哈蘇", t: "邏輯驗證完畢。通道暢通。做得好。", chars: [{id:'char-hassel', pos:'pos-center', state:'active'}] },
                { n: "喬諾娜", t: "恭喜你們通過了考驗～拿去吧，這是給聰明人的禮物。", chars: [{id:'char-jonona', pos:'pos-jonona', state:'active'}] },
                { n: "諾郎", t: "哼... 這次就算你們贏了。下次別讓我再看到你們。", chars: [{id:'char-nolang', pos:'pos-nolang', state:'active'}] },
                { n: "神器", t: "【第二章 CLEAR】獲得神器：雙子櫻桃 (Switch)。", chars: [] },
                { n: "克里昂", t: "這東西能切換狀態... 希望也能切換我的運氣。", chars: [{id:'char-kleion', pos:'pos-center', state:'active'}] },
                { n: "哈蘇", t: "別做夢了。下一站是海邊交易所，跟緊我。", chars: [{id:'char-hassel', pos:'pos-center', state:'active'}] }
            ];
            currentScript = endScript;
            index = -1;
            document.getElementById('dialogue-box').style.display = 'block';
            nextScript();
        }

        // --- 第三章邏輯 (Stage 3 Logic) ---
        function initStage3() {
            gameMode = 'stage3-intro';
            fadeMusic('stage3');
            
            // 背景切換
            document.querySelectorAll('.bg-layer').forEach(bg => bg.style.opacity = 0);
            document.getElementById('bg-stage3').style.opacity = 1;
            
            loadStage3Level(1);
        }

        function loadStage3Level(lv) {
            currentLvl = lv;
            const data = stage3Levels[lv];
            
            document.getElementById('level-title').innerText = data.title;
            document.getElementById('level-title').style.display = 'block';
            document.getElementById('stage3-game-area').style.display = 'none';
            
            // 設定章節標題顏色 (第三章：紫色/海藍)
            const badge = document.getElementById('level-title');
            badge.style.color = '#BCE5EB';
            badge.style.borderLeftColor = 'var(--ora-color)';
            
            // 隱藏其他章節 UI
            document.getElementById('logic-panel').classList.remove('open');
            document.getElementById('error-msg').style.display = 'none';
            document.getElementById('btn-vision').style.display = 'none';

            currentScript = data.intro;
            index = -1;
            document.getElementById('dialogue-box').style.display = 'block';
            nextScript();
        }

        function setupStage3UI(lv) {
            // 隱藏所有角色，避免卡在畫面上
            document.querySelectorAll('.char-img').forEach(img => {
                img.style.opacity = 0;
                img.classList.remove('active', 'dim');
            });

            const data = stage3Levels[lv];
            const container = document.getElementById('array-container');
            const controls = document.getElementById('controls');
            
            document.getElementById('task-text').innerText = data.task;
            
            // 清空箱子但保留指針
            while (container.lastElementChild && container.lastElementChild.id !== 'pointer') {
                container.removeChild(container.lastElementChild);
            }

            // 初始化數據
            boxData = data.items.map(item => ({ content: item, revealed: !data.hidden }));
            pointerPos = 0;

            // 生成箱子
            boxData.forEach((obj, index) => {
                const box = document.createElement('div');
                box.className = data.hidden ? 'box hidden' : 'box';
                box.id = `box-${index}`;
                
                const contentSpan = document.createElement('span');
                contentSpan.innerText = obj.content;
                box.appendChild(contentSpan);

                const label = document.createElement('div');
                label.className = 'index-label';
                label.innerText = `[${index}]`;
                box.appendChild(label);
                
                container.appendChild(box);
            });

            // 控制按鈕
            controls.innerHTML = `
                <button class="ctrl-btn" onclick="playStage2ClickSound(); stage3MovePointer(-1)">◀</button>
                <button class="ctrl-btn" onclick="playStage2ClickSound(); stage3MovePointer(1)">▶</button>
            `;
            if (data.tools.includes('inspect')) controls.innerHTML += `<button class="check-btn" style="width:auto; margin:0; padding:0 20px; background:#74b9ff;" onclick="playStage2ClickSound(); stage3Inspect()">👁️ INSPECT</button>`;
            if (data.tools.includes('get')) controls.innerHTML += `<button class="check-btn" style="width:auto; margin:0; padding:0 20px; background:var(--accent);" onclick="playStage2ClickSound(); stage3Get()">⏫ GET</button>`;
            if (data.tools.includes('swap')) controls.innerHTML += `<button class="check-btn" style="width:auto; margin:0; padding:0 20px; background:var(--manmu-color);" onclick="playStage2ClickSound(); stage3Swap()">🔄 SWAP LEFT</button>`;

            document.getElementById('stage3-game-area').style.display = 'flex';
            document.getElementById('dialogue-box').style.display = 'none';
            setTimeout(() => stage3UpdatePointer(), 100);
        }

        function stage3MovePointer(dir) {
            const max = boxData.length - 1;
            pointerPos += dir;
            if(pointerPos < 0) pointerPos = 0;
            if(pointerPos > max) pointerPos = max;
            stage3UpdatePointer();
        }

        function stage3UpdatePointer() {
            const targetBox = document.getElementById(`box-${pointerPos}`);
            const pointer = document.getElementById('pointer');
            if (targetBox && pointer) {
                const centerPos = targetBox.offsetLeft + (targetBox.offsetWidth / 2) - (pointer.offsetWidth / 2);
                pointer.style.left = `${centerPos}px`;
                document.querySelectorAll('.box').forEach(b => b.classList.remove('active-target'));
                targetBox.classList.add('active-target');
            }
        }

        function stage3Inspect() {
            const box = document.getElementById(`box-${pointerPos}`);
            const data = boxData[pointerPos];
            if (box.classList.contains('hidden')) {
                box.classList.remove('hidden');
                data.revealed = true;
            }
        }

        function stage3Get() {
            const data = boxData[pointerPos];
            if (!data.revealed) { showModal("ACCESS DENIED", "數據未解碼！請先執行 INSPECT！"); return; }
            if (data.content === "💣") { showModal("SYSTEM CRASH", "💥 錯誤！你提取了炸彈！記憶體崩潰！", () => loadStage3Level(currentLvl)); return; }
            if (data.content === "🗑️") { showModal("NULL POINTER", "這是垃圾數據... 不是我們要找的。"); return; }

            if ((currentLvl === 1 && data.content === "💰") || (currentLvl === 2 && data.content === "🍃")) {
                document.getElementById('sfx-success').play();
                showModal("ITEM ACQUIRED", "回收成功！", () => loadStage3Level(currentLvl + 1));
            } else {
                showModal("ERROR", "這不是目標物品。");
            }
        }

        function stage3Swap() {
            if (pointerPos === 0) { showModal("ERROR", "已經在最左邊了，無法向左交換！"); return; }
            
            // 鎖定控制，防止動畫中途操作
            const controls = document.getElementById('controls');
            controls.style.pointerEvents = 'none';

            const currentIdx = pointerPos;
            const leftIdx = pointerPos - 1;
            
            const boxCurrent = document.getElementById(`box-${currentIdx}`);
            const boxLeft = document.getElementById(`box-${leftIdx}`);
            const distance = boxCurrent.offsetLeft - boxLeft.offsetLeft;

            // 動畫開始
            boxCurrent.style.transition = "transform 0.3s ease-in-out";
            boxLeft.style.transition = "transform 0.3s ease-in-out";
            
            boxCurrent.style.transform = `translateX(-${distance}px)`;
            boxLeft.style.transform = `translateX(${distance}px)`;

            // 300ms 後執行數據交換與指針移動
            setTimeout(() => {
                const temp = boxData[currentIdx]; boxData[currentIdx] = boxData[leftIdx]; boxData[leftIdx] = temp;
                
                boxCurrent.style.transition = ""; boxLeft.style.transition = "";
                boxCurrent.style.transform = ""; boxLeft.style.transform = "";
                
                boxData.forEach((obj, idx) => { document.querySelector(`#box-${idx} span`).innerText = obj.content; });
                
                // 指針跟隨物品移動到新位置
                stage3MovePointer(-1);
                
                controls.style.pointerEvents = 'auto';

                if (currentLvl === 3 && boxData[0].content === "🔧") {
                    document.getElementById('sfx-success').play();
                    setTimeout(() => {
                        document.getElementById('stage3-game-area').style.display = 'none';
                        startStage3Ending();
                    }, 500);
                }
            }, 300);
        }

        function startStage3Ending() {
            gameMode = 'stage3-success';
            
            // 切換背景為退潮
            document.querySelectorAll('.bg-layer').forEach(bg => bg.style.opacity = 0);
            document.getElementById('bg-stage3-end').style.opacity = 1;

            const endScript = [
                { n: "小目", t: "太完美了！修復代碼開始運作了！海平面下降了！我的錢保住了！", chars: [{id:'char-manmu', pos:'pos-center', state:'active', face:'default'}] },
                { n: "奧拉", t: "勉強及格。看來你的腦容量還能裝下一點東西。這片海暫時穩定了。", chars: [{id:'char-ora', pos:'pos-center', state:'active'}] },
                { n: "小目", t: "兄弟，這個【商人的虛空箱】送你！有了它，你就能隨時整理你的道具！", chars: [{id:'char-manmu', pos:'pos-center', state:'active', face:'default'}] },
                { n: "神器", t: "【第三章 CLEAR】獲得神器：商人的虛空箱 (Array)。", chars: [] },
                { n: "奧拉", t: "下課。我還要去找人。別死在半路上了，學生。", chars: [{id:'char-ora', pos:'pos-center', state:'active'}] }
            ];
            currentScript = endScript;
            index = -1;
            document.getElementById('dialogue-box').style.display = 'block';
            nextScript();
        }
        
        // --- 第四章邏輯 (Stage 4 Logic) ---
        function initStage4() {
            gameMode = 'stage4-intro';
            fadeMusic('stage4');
            
            document.querySelectorAll('.bg-layer').forEach(bg => bg.style.opacity = 0);
            document.getElementById('bg-stage4').style.opacity = 1;
            
            loadStage4Level(1);
        }

        function loadStage4Level(lv) {
            currentLvl = lv;
            const data = stage4Levels[lv];
            
            // 修正：重置蘭蘭狀態，防止重玩時消失
            if (lv === 1) {
                const lanlan = document.getElementById('lanlan-obj');
                lanlan.classList.remove('liquid');
                lanlan.innerHTML = "<span style='font-size:80px;'>🦎💦</span>";
                lanlan.style.transform = "";
            }
            
            startSmokeEffect(); // 啟動冒煙特效

            document.getElementById('level-title').innerText = data.title;
            document.getElementById('level-title').style.display = 'block';
            document.getElementById('stage4-game-area').style.display = 'none';
            
            const badge = document.getElementById('level-title');
            badge.style.color = '#5C8D94';
            badge.style.borderLeftColor = 'var(--lanlan-color)';
            
            // 隱藏其他章節 UI
            document.getElementById('stage3-game-area').style.display = 'none';
            document.getElementById('property-panel').classList.remove('open');

            currentScript = data.intro;
            index = -1;
            document.getElementById('dialogue-box').style.display = 'block';
            nextScript();
        }

        function setupStage4UI(lv) {
            document.getElementById('stage4-game-area').style.display = 'block';
            document.getElementById('dialogue-box').style.display = 'none';
            if (lv === 1) {
                // 等待玩家點擊
            } else if (lv === 2) {
                openInspector();
            } else if (lv === 3) {
                openInspector();
            }
        }

        function shakeChimney() {
            const chimney = document.getElementById('chimney-obj');
            chimney.classList.remove('shaking');
            void chimney.offsetWidth; // 觸發重繪
            chimney.classList.add('shaking');
        }

        function startSmokeEffect() {
            const container = document.getElementById('chimney-smoke');
            if(!container) return;
            
            if(window.smokeInterval) clearInterval(window.smokeInterval);

            window.smokeInterval = setInterval(() => {
                if(document.getElementById('stage4-game-area').style.display === 'none') return;
                
                const p = document.createElement('div');
                p.className = 'smoke-particle';
                const size = 20 + Math.random() * 30;
                p.style.width = size + 'px'; p.style.height = size + 'px';
                p.style.left = (50 + (Math.random() - 0.5) * 20) + '%';
                p.style.animationDuration = (3 + Math.random() * 2) + 's';
                container.appendChild(p);
                setTimeout(() => p.remove(), 5000);
            }, 400);
        }

        function openInspector() {
            const panel = document.getElementById('property-panel');
            panel.classList.add('open');
            document.getElementById('dialogue-box').style.display = 'none';
            document.getElementById('sfx-scan').play();
            
            // 觸發掃描特效
            const scanLine = document.getElementById('scan-line');
            if(scanLine) {
                scanLine.classList.remove('scanning');
                void scanLine.offsetWidth; // 重置動畫
                scanLine.classList.add('scanning');
            }
            
            if(currentLvl === 1) {
                setTimeout(() => {
                    showModal("SCAN COMPLETE", "掃描完成！檢視屬性表。", () => loadStage4Level(2));
                }, 800);
            } else if(currentLvl === 2) {
                document.getElementById('friction-select').disabled = false;
                document.getElementById('friction-select').value = "High"; // 重置為 High，強制玩家修改
            } else if(currentLvl === 3) {
                document.getElementById('friction-select').disabled = true; 
                document.getElementById('drop-zone').style.display = 'flex';
                document.getElementById('tag-drawer').style.display = 'flex';
                setupStage4DragDrop();
            }
        }

        function closeInspector() {
            document.getElementById('property-panel').classList.remove('open');
            // document.getElementById('dialogue-box').style.display = 'block'; // 視情況開啟，但通常由劇情控制
        }

        function checkStage4Select() {
            const btn = document.getElementById('apply-btn');
            btn.classList.add('active'); 
            btn.disabled = false;
        }

        function setupStage4DragDrop() {
            const tags = document.querySelectorAll('.prop-tag');
            const dropZone = document.getElementById('drop-zone');
            tags.forEach(tag => {
                tag.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', e.target.id); });
                // 手機點擊支援
                tag.addEventListener('click', () => { if(confirm("確定要套用這個標籤嗎？")) handleStage4Drop(tag.id); });
            });
            dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
            dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('dragover'); });
            dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); handleStage4Drop(e.dataTransfer.getData('text/plain')); });
        }

        function handleStage4Drop(id) {
            const dropZone = document.getElementById('drop-zone');
            if(id === 'tag-liquid') {
                dropZone.innerHTML = `&nbsp;&nbsp;<span class="key">State:</span> <span class="value">"Liquid"</span>,`;
                dropZone.style.borderColor = "#2ecc71";
                document.getElementById('apply-btn').classList.add('active');
                document.getElementById('apply-btn').disabled = false;
            } else {
                showModal("INVALID TAG", "這個標籤無效... 把他變成石頭會卡更死吧？");
            }
        }

        function applyInspectorChanges() {
            const btn = document.getElementById('apply-btn');
            if(btn.disabled) return;

            if(currentLvl === 2) {
                const val = document.getElementById('friction-select').value;
                if(val === "Low" || val === "Zero") {
                    document.getElementById('sfx-success').play();
                    document.getElementById('lanlan-obj').style.transform = "translateY(30px)";
                    showModal("UPDATE SUCCESS", "摩擦力參數修改成功！", () => loadStage4Level(3));
                } else {
                    showModal("ERROR", "摩擦力還是 High... 這樣出不來。");
                }
            } else if (currentLvl === 3) {
                document.getElementById('property-panel').classList.remove('open');
                const lanlan = document.getElementById('lanlan-obj');
                lanlan.classList.add('liquid');
                lanlan.innerHTML = "<span style='font-size:80px'>💧</span>";
                document.getElementById('sfx-success').play();
                setTimeout(() => startStage4Ending(), 2000);
            }
        }

        function startStage4Ending() {
            gameMode = 'stage4-success';
            document.getElementById('stage4-game-area').style.display = 'none';
            
            // 切換背景為沒腳的版本
            document.querySelectorAll('.bg-layer').forEach(bg => bg.style.opacity = 0);
            document.getElementById('bg-stage4-end').style.opacity = 1;

            const endScript = [
                { n: "蘭蘭", t: "（變回原形）哇！活過來了呀！剛剛變成水的感覺好奇怪，涼涼的！", chars: [{id:'char-lanlan', pos:'pos-lanlan', state:'active'}] },
                { n: "茉莉", t: "（遞上毛巾）沒事就好。真是嚇壞我了。來，擦擦臉吧。", chars: [{id:'char-moli', pos:'pos-moli', state:'active'}] },
                { n: "蘭蘭", t: "謝謝茉莉！你人真好！難怪小目那麼喜歡你！", chars: [{id:'char-lanlan', pos:'pos-lanlan', state:'active'}] },
                { n: "茉莉", t: "呵呵... 是嗎？", chars: [{id:'char-moli', pos:'pos-moli', state:'active', face:'happy'}] },
                { n: "茉莉", t: "這台【幻影標籤機】就送給你們吧。這是我從林恩那裡拿到的，但我不太會用。希望能幫到你們。", chars: [{id:'char-moli', pos:'pos-moli', state:'active'}] },
                { n: "神器", t: "【第四章 CLEAR】獲得神器：幻影標籤機 (Var)。", chars: [] },
                { n: "哈蘇", t: "任務完成。走吧，下一站是迷宮。", chars: [{id:'char-hassel', pos:'pos-center', state:'active'}] }
            ];
            currentScript = endScript;
            index = -1;
            document.getElementById('dialogue-box').style.display = 'block';
            nextScript();
        }

        // --- 第五章邏輯 (Stage 5 Logic) ---
        function initStage5() {
            gameMode = 'stage5-intro';
            fadeMusic('stage5');
            
            document.querySelectorAll('.bg-layer').forEach(bg => bg.style.opacity = 0);
            document.getElementById('bg-stage5').style.opacity = 1;
            
            loadStage5Level(1);
        }

        function loadStage5Level(lv) {
            currentLvl = lv;
            scriptQueue = [...stage5Levels[lv].intro];
            scriptIndex = -1;
            
            isSimulating = false;
            document.getElementById('stage5-code-panel').classList.remove('open');
            document.getElementById('stage5-game-area').style.display = 'none';
            document.getElementById('dialogue-box').style.display = 'block';
            document.getElementById('scold-overlay').style.display = 'none';
            document.getElementById('ball-container').innerHTML = '';
            document.getElementById('condition-display').innerText = "IF ( ??? )";

            updateStage5EditorUI();
            
            // 背景處理
            if (lv === 4) {
                document.getElementById('bg-stage5').style.opacity = 0;
                document.getElementById('bg-stage5-alert').style.opacity = 1;
                document.getElementById('sfx-warning').play(); // 播放警告音效
            } else {
                // 重置背景亮度 (恢復對話時的亮度)
                document.getElementById('bg-stage5').style.filter = "blur(2px) brightness(0.6)";
            }

            // 顯示章節標題
            const data = stage5Levels[lv];
            document.getElementById('level-title').innerText = data.title;
            document.getElementById('level-title').style.display = 'block';
            const badge = document.getElementById('level-title');
            badge.style.color = 'var(--melas-color)';
            badge.style.borderLeftColor = 'var(--primary)';
            
            // 隱藏其他章節 UI
            document.getElementById('stage4-game-area').style.display = 'none';
            document.getElementById('property-panel').classList.remove('open');
            // 隱藏 Stage 1, 2, 3 UI
            document.getElementById('stage3-game-area').style.display = 'none';
            document.getElementById('logic-panel').classList.remove('open');
            document.getElementById('btn-vision').style.display = 'none';
            document.getElementById('code-editor').classList.remove('open');

            currentScript = stage5Levels[lv].intro;
            index = -1;
            nextScript();
        }

        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        function updateStage5EditorUI() {
            const s1 = document.getElementById('select-1');
            const s2 = document.getElementById('select-2');
            const extra = document.getElementById('extra-condition');
            
            // 隨機排列選項 (保留 ??? 在最上方)
            let colors = [
                {v: "red", t: "Color: RED"}, {v: "blue", t: "Color: BLUE"}, {v: "black", t: "Color: BLACK"}
            ];
            shuffleArray(colors);
            s1.innerHTML = `<option value="">???</option>` + colors.map(c => `<option value="${c.v}">${c.t}</option>`).join('');
            s1.value = "";
            
            if (currentLvl === 3) {
                extra.style.display = "inline";
                let shapes = [
                    {v: "circle", t: "Shape: CIRCLE"}, {v: "square", t: "Shape: SQUARE"}
                ];
                shuffleArray(shapes);
                s2.innerHTML = `<option value="">???</option>` + shapes.map(s => `<option value="${s.v}">${s.t}</option>`).join('');
                s2.value = "";
            } else {
                extra.style.display = "none";
            }
            
            if (currentLvl === 4) {
                document.getElementById('stage5-code-panel').classList.add('virus-mode');
                document.getElementById('gate-box').classList.add('virus-mode');
                // document.getElementById('bg-stage5').classList.add('alert'); // 移除舊邏輯
                document.getElementById('right-comment').innerText = "// Virus Trash";
            } else {
                document.getElementById('stage5-code-panel').classList.remove('virus-mode');
                document.getElementById('gate-box').classList.remove('virus-mode');
                // document.getElementById('bg-stage5').classList.remove('alert'); // 移除舊邏輯
                document.getElementById('right-comment').innerText = "// Else";
            }
        }

        function setupStage5UI(lv) {
            document.getElementById('stage5-game-area').style.display = 'block';
            document.getElementById('dialogue-box').style.display = 'none';
            // 小遊戲開始時，背景壓暗
            if (lv === 4) {
                document.getElementById('bg-stage5-alert').style.filter = "blur(2px) brightness(0.3)";
            } else {
                document.getElementById('bg-stage5').style.filter = "blur(2px) brightness(0.3)";
            }
        }

        function openStage5Editor() { if(!isSimulating) document.getElementById('stage5-code-panel').classList.add('open'); }
        function closeStage5Editor() { document.getElementById('stage5-code-panel').classList.remove('open'); }

        function runSimulation() {
            const v1 = document.getElementById('select-1').value;
            const v2 = document.getElementById('select-2').value;
            
            if(!v1) return;
            if(currentLvl === 3 && !v2) return;

            document.getElementById('stage5-code-panel').classList.remove('open');
            document.getElementById('condition-display').innerText = `RUNNING...`;
            
            const userConfig = { c: v1, s: (currentLvl === 3 ? v2 : null) };
            startBallDrop(userConfig);
        }

        function startBallDrop(userConfig) {
            isSimulating = true;
            const balls = stage5Levels[currentLvl].balls;
            const target = stage5Levels[currentLvl].targetConfig;
            let count = 0;

            const interval = setInterval(() => {
                if(count >= balls.length) {
                    clearInterval(interval);
                    setTimeout(() => {
                        document.getElementById('sfx-success').play();
                        showModal("LOGIC PERFECT", "邏輯完美！任務達成！", () => {
                            if(currentLvl < 4) loadStage5Level(currentLvl + 1);
                            else startStage5Ending();
                        });
                    }, 2500);
                    return;
                }
                
                const b = balls[count];
                
                // 1. 玩家設定的邏輯 -> 決定球去左還是右
                let playerPass = false;
                if(currentLvl === 3) {
                    if(b.c === userConfig.c && b.s === userConfig.s) playerPass = true;
                } else {
                    if(b.c === userConfig.c) playerPass = true;
                }

                // 2. 遊戲正確邏輯 -> 決定這顆球「應該」去哪
                let shouldPass = false;
                if(currentLvl === 3) {
                    if(b.c === target.c && b.s === target.s) shouldPass = true;
                } else {
                    if(b.c === target.c) shouldPass = true;
                }

                // 3. 錯誤檢測 (如果玩家判斷錯誤)
                if (playerPass !== shouldPass) {
                    clearInterval(interval);
                    spawnBall(b, playerPass); 
                    setTimeout(() => triggerScolding(), 1000); // 觸發懲罰
                    return;
                }

                spawnBall(b, playerPass);
                count++;
            }, 1000);
        }

        function spawnBall(data, goesLeft) {
            const ball = document.createElement('div');
            ball.className = `ball ${data.c} ${data.s}`;
            document.getElementById('ball-container').appendChild(ball);

            setTimeout(() => ball.style.top = "160px", 50);
            setTimeout(() => {
                ball.style.left = goesLeft ? "20%" : "80%";
                ball.style.top = "400px";
                highlightBasket(goesLeft ? 'basket-left' : 'basket-right');
                document.getElementById('sfx-ball-fall').play(); // 播放下落音效
            }, 600);
            setTimeout(() => ball.remove(), 2000);
        }

        function highlightBasket(id) {
            const b = document.getElementById(id);
            b.classList.add('active');
            setTimeout(() => b.classList.remove('active'), 200);
        }

        function triggerScolding() {
            const insults = [
                "你的腦袋是裝飾品嗎？",
                "連這種邏輯都跑不動？",
                "數據溢位！你搞砸了！",
                "奧拉對你的智商感到絕望。"
            ];
            const msg = insults[Math.floor(Math.random() * insults.length)];
            document.getElementById('scold-msg').innerText = msg;
            document.getElementById('scold-overlay').style.display = 'flex';
        }

        function retryLevel() {
            loadStage5Level(currentLvl);
        }

        function startStage5Ending() {
            gameMode = 'stage5-success';
            
            // 切換回正常背景 (觸發 CSS transition)
            document.getElementById('bg-stage5-alert').style.opacity = 0;
            document.getElementById('bg-stage5').style.opacity = 1;

            const endScript = [
                { n: "奧拉", t: "...攔截成功。勉強能看。", chars: [{id:'char-ora', pos:'pos-center', state:'active'}] },
                { n: "蜜拉思", t: "切，真沒意思。奧拉，你對學生太嚴格了啦。", chars: [{id:'char-melas', pos:'pos-melas', state:'active'}, {id:'char-ora', pos:'pos-center', state:'dim'}] },
                { n: "奧拉", t: "拿去吧。這是【黃金天平】。", chars: [{id:'char-ora', pos:'pos-center', state:'active'}] },
                { n: "神器", t: "【第五章 CLEAR】獲得神器：黃金天平 (Condition)。", chars: [] },
                { n: "奧拉", t: "沒有下次。蜜拉思，跟我回辦公室寫檢討報告。", chars: [{id:'char-ora', pos:'pos-center', state:'active'}] }
            ];
            currentScript = endScript;
            index = -1;
            document.getElementById('dialogue-box').style.display = 'block';
            document.getElementById('stage5-game-area').style.display = 'none';
            nextScript();
        }

        // --- 自定義彈窗邏輯 ---
        let modalCallback = null;
        function showModal(title, text, callback) {
            document.getElementById('modal-title').innerText = title;
            document.getElementById('modal-text').innerText = text;
            document.getElementById('custom-modal-overlay').style.display = 'flex';
            modalCallback = callback;
        }
        function closeModal() {
            document.getElementById('custom-modal-overlay').style.display = 'none';
            if(modalCallback) {
                modalCallback();
                modalCallback = null;
            }
        }

        // --- 系統選單邏輯 (章節 + 背包) ---
        const chapters = [
            { id: 0, title: "Prologue: 404 Not Found" },
            { id: 1, title: "Stage 1: 焦慮的兔子" },
            { id: 2, title: "Stage 2: 雙子路障" },
            { id: 3, title: "Stage 3: 總裁的歷史課" },
            { id: 4, title: "Stage 4: 卡住的煙囪" },
            { id: 5, title: "Stage 5: 傲慢的迷宮" },
            { id: 6, title: "Stage 6: 躺平茶會" },
            { id: 7, title: "Stage 7: 邏輯花園" }
        ];

        function openSystemMenu() {
            const menu = document.getElementById('system-menu');
            const list = document.getElementById('chapter-list-container');
            list.innerHTML = '';

            chapters.forEach(c => {
                const btn = document.createElement('div');
                const isUnlocked = c.id <= unlockedProgress;
                
                btn.className = `chapter-btn ${isUnlocked ? 'unlocked' : ''}`;
                btn.innerHTML = `
                    <span>${c.title}</span>
                    <span class="status">${isUnlocked ? '[ ACCESS GRANTED ]' : '[ LOCKED ]'}</span>
                `;
                
                if(isUnlocked) {
                    btn.onclick = () => { playClickSound(); loadChapter(c.id); };
                }
                
                list.appendChild(btn);
            });

            // Render Inventory
            const invList = document.getElementById('inventory-list');
            const descBox = document.getElementById('inventory-desc');
            invList.innerHTML = '';
            descBox.style.display = 'none';
            descBox.innerHTML = '';
            
            // 物品圖片對應表
            const itemImages = {
                "懷錶發條": "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%B8%80%E7%AB%A0/%E7%99%BC%E6%A2%9D%E6%87%B7%E9%8C%B6.png",
                "雙子櫻桃": "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%BA%8C%E7%AB%A0/%E9%9B%99%E5%AD%90%E6%AB%BB%E6%A1%83.png",
                "商人的虛空箱": "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%B8%89%E7%AB%A0/%E5%95%86%E4%BA%BA%E7%9A%84%E8%99%9B%E7%A9%BA%E7%AE%B1.png",
                "幻影標籤機": "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E5%9B%9B%E7%AB%A0/%E5%B9%BB%E5%BD%B1%E6%A8%99%E7%B1%A4%E6%A9%9F.png",
                "黃金天平": "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%BA%94%E7%AB%A0/GLD.png",
                "無限續杯茶壺": "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E5%85%AD%E7%AB%A0/%E8%8C%B6%E6%9D%AF.png",
                "皇家油漆刷 (Function)": "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%B8%83%E7%AB%A0/%E6%B2%B9%E6%BC%86%E5%88%B7.png"
            };
            
            const itemDescs = {
                "懷錶發條": "【外觀描述】 看似一枚古老的黃銅發條，表面卻蝕刻著微小的電路紋理。握在手中時，能感覺到微微的溫熱與脈衝，彷彿它連接著某個巨大的、看不見的心臟。發條周圍偶爾會飄散出 0 與 1 的金色塵埃。\n\n【功能權限】\n\n解鎖能力：Sequence Control (序列控制)\n\n權限等級：Admin (實習生暫用)\n\n效果：允許使用者重新排列事件的執行順序，強制修正因果律錯誤。\n\n【備註】 「拿穩了。這不是普通的金屬，這是我們還能擁有『明天』的唯一理由。」 —— 哈蘇",
                "雙子櫻桃": "【外觀描述】 一對晶瑩剔透的櫻桃，連接著同一根蒂頭。左邊是鮮紅的 TRUE，右邊是深藍的 FALSE。表面流動著二進制的微光。\n\n【功能權限】\n\n解鎖能力：Logic Switch (邏輯切換)\n\n權限等級：User (使用者)\n\n效果：強制反轉目標的布林值 (Boolean) 狀態。\n\n【備註】 「真與假往往是一體兩面。就像這對櫻桃，酸甜共生。」 —— 喬諾娜",
                "商人的虛空箱": "【外觀描述】 一個看似普通的木箱，但內部空間似乎連接著另一個維度。箱子上刻著浮動的索引數字 [0, 1, 2...]。\n\n【功能權限】\n\n解鎖能力：Array Storage (陣列儲存)\n\n權限等級：User (使用者)\n\n效果：能以陣列形式儲存無限物品，並透過索引 (Index) 隨取隨用。\n\n【備註】 「兄弟，這可是好東西！只要你記得東西放在第幾格。」 —— 小目",
                "幻影標籤機": "【外觀描述】 一台精密的黃銅儀器，鏡頭散發著紫色的光芒。能掃描物件的底層代碼。\n\n【功能權限】\n\n解鎖能力：Property Inspector (屬性檢視)\n\n權限等級：Admin (管理員)\n\n效果：檢視並修改物件的屬性標籤 (Properties)。將不可能化為可能。\n\n【備註】 「希望能幫這孩子快點出來，他叫得嗓子都啞了。」 —— 茉莉",
                "黃金天平": "【外觀描述】 一個純金打造的天平，但兩端秤盤上放的不是砝碼，而是發光的代碼塊。指針永遠指向「邏輯正確」的一方。\n\n【功能權限】\n\n解鎖能力：Conditional Logic (條件判斷)\n\n權限等級：Admin (管理員)\n\n效果：掌控 IF/ELSE 的絕對權限，決定數據的流向與命運。\n\n【備註】 「收好它。別像蜜拉思那樣把它當玩具。這是『邏輯』的重量。」 —— 奧拉",
                "無限續杯茶壺": "【外觀描述】 一個永遠倒不完的茶壺，裡面裝著能讓程式無限運行的液體代碼。\n\n【功能權限】\n\n解鎖能力：Loop Control (迴圈控制)\n\n權限等級：User (使用者)\n\n效果：控制重複執行的次數與條件。\n\n【備註】 「這份是... 強制喚醒的補償。請收下。」 —— 蘇郎",
                "皇家油漆刷 (Function)": "【外觀描述】 一支柄身雕刻著繁複藤蔓與「{ }」括號圖騰的黃金畫筆。刷毛沾滿了名為「真理」的鮮紅材質，揮動時會噴灑出代碼粒子，並在空中自動留下閉合的函數定義軌跡。\n\n【功能權限】\n\n解鎖能力： Function Packaging (函數封裝)\n\n權限等級： Architect (架構師)\n\n效果： 將複數個繁瑣的操作步驟打包為模組，並將其定義為可無限重複呼叫的單一指令。\n\n【備註】 「沾漆、瞄準、塗抹……太慢了！太不吉利了！與其重複勞動一千次，不如定義一個函數一鍵搞定。皇家的效率，從封裝開始。」 —— 彼得"
            };

            if(playerInventory.length === 0) {
                invList.innerHTML = '<div style="color:#666; width:100%; text-align:center; grid-column:1/-1;">背包是空的</div>';
            } else {
                playerInventory.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'inv-item';
                    div.style.cursor = 'pointer';
                    if(itemImages[item]) {
                        let style = "width:50px; height:50px; object-fit:contain; filter:drop-shadow(0 0 5px var(--primary));";
                        // if(item === "雙子櫻桃") style += " hue-rotate(180deg);"; // 移除色相旋轉，使用原圖
                        div.innerHTML = `<img src="${itemImages[item]}" style="${style}"><div class="inv-name">${item}</div>`;
                    } else {
                        div.innerHTML = `<div class="inv-icon">⚙️</div><div class="inv-name">${item}</div>`;
                    }
                    
                    div.onclick = () => {
                        playClickSound();
                        const wasActive = div.classList.contains('active-item');
                        
                        document.querySelectorAll('.inv-item').forEach(i => i.style.borderColor = '#444');
                        document.querySelectorAll('.inv-item').forEach(i => i.classList.remove('active-item'));

                        if (!wasActive) {
                            div.classList.add('active-item');
                            div.style.borderColor = 'var(--primary)';
                            if(itemDescs[item]) {
                                descBox.style.display = 'block';
                                descBox.innerText = itemDescs[item];
                            } else {
                                descBox.style.display = 'none';
                            }
                        } else {
                            descBox.style.display = 'none';
                        }
                    };
                    invList.appendChild(div);
                });
            }

            menu.style.display = 'flex';
        }

        function closeSystemMenu() {
            document.getElementById('system-menu').style.display = 'none';
        }

        function switchTab(tab) {
            document.querySelectorAll('.sys-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.sys-content').forEach(c => c.classList.remove('active'));
            
            if(tab === 'history') {
                document.querySelector('.sys-tab:nth-child(1)').classList.add('active');
                document.getElementById('tab-history').classList.add('active');
                // 重新渲染對話紀錄並滾動到底部
                renderHistoryLog();
                const historyContent = document.getElementById('tab-history');
                // 讓新對話在最下方，所以滾動到最底部
                historyContent.scrollTop = historyContent.scrollHeight;
            } else if(tab === 'chapters') {
                document.querySelector('.sys-tab:nth-child(2)').classList.add('active');
                document.getElementById('tab-chapters').classList.add('active');
            } else if(tab === 'inventory') {
                document.querySelector('.sys-tab:nth-child(3)').classList.add('active');
                document.getElementById('tab-inventory').classList.add('active');
            } else if(tab === 'settings') {
                document.querySelector('.sys-tab:nth-child(4)').classList.add('active');
                document.getElementById('tab-settings').classList.add('active');
            }
        }

        function loadChapter(id) {
            performTransition(() => {
                closeSystemMenu();
                document.getElementById('start-screen').style.display = 'none';
                document.getElementById('dialogue-box').style.display = 'block';
                isPlaying = true;
                initAudio();

                // 修正：切換章節時重置背包，確保道具不會因為存檔而提前出現
                playerInventory = [];
                dialogueHistory = []; // 重置對話紀錄
                localStorage.setItem('wonderland_inventory', JSON.stringify(playerInventory));

                // FIX: 清除所有背景層的強制樣式 (解決從第七章切換到其他章節時背景卡住的問題)
                document.querySelectorAll('.bg-layer').forEach(bg => {
                    bg.style.removeProperty('opacity');
                    bg.style.removeProperty('display');
                    bg.style.removeProperty('z-index');
                    bg.style.opacity = 0;
                });
                
                // 修正：強制關閉第四章小遊戲介面與屬性面板
                document.getElementById('stage4-game-area').style.display = 'none';
                // 修正：強制關閉第五章小遊戲介面
                document.getElementById('stage5-game-area').style.display = 'none';
                document.getElementById('stage5-code-panel').classList.remove('open');
                // 修正：強制關閉第六章小遊戲介面
                document.getElementById('stage6-game-area').style.display = 'none';
                document.getElementById('terminal-panel').classList.remove('open');
                document.getElementById('char-surang').style.display = 'none'; // 隱藏蘇郎立繪
                
                // 修正：強制關閉第七章小遊戲介面
                document.getElementById('stage7-game-area').style.display = 'none';
                document.getElementById('sanity-hud').style.display = 'none';
                document.getElementById('brush').style.display = 'none';

                document.getElementById('property-panel').classList.remove('open');
                if(window.smokeInterval) clearInterval(window.smokeInterval); // 停止冒煙

                if(id === 0) {
                    loadPrologue();
                } else if (id === 1) {
                    initStage1(); // 切換音樂與背景
                } else if (id === 2) {
                    initStage2();
                } else if (id === 3) {
                    initStage3();
                } else if (id === 4) {
                    initStage4();
                } else if (id === 5) {
                    initStage5();
                } else if (id === 6) {
                    initStage6();
                } else if (id === 7) {
                    initStage7();
                }
                
                
            });
        }

        // --- 音量控制 ---
        function setBgmVolume(val) {
            globalBgmVolume = parseFloat(val);
            if(currentBgm) currentBgm.volume = globalBgmVolume;
        }

        function setSfxVolume(val) {
            globalSfxVolume = parseFloat(val);
            document.querySelectorAll('audio[id^="sfx-"]').forEach(a => a.volume = globalSfxVolume);
            if(dragGainNode) dragGainNode.gain.value = 3.0 * globalSfxVolume;
        }
            // 將對話紀錄相關功能獨立出來，方便管理
        function renderHistoryLog() {
            const historyContainer = document.getElementById('history-log-container');
            historyContainer.innerHTML = '';
            if (dialogueHistory.length === 0) {
                historyContainer.innerHTML = '<div style="color:#666; text-align:center; padding-top: 20px;">尚無對話紀錄</div>';
            } else {
                dialogueHistory.forEach(entry => {
                    const div = document.createElement('div');
                    div.className = 'history-entry';
                    
                    const nameDiv = document.createElement('div');
                    nameDiv.className = 'history-name';
                    nameDiv.innerText = entry.name;
                    
                    const textDiv = document.createElement('div');
                    textDiv.className = 'history-text';
                    textDiv.innerText = entry.text;
                    
                    div.appendChild(nameDiv);
                    div.appendChild(textDiv);
                    historyContainer.appendChild(div);
                });
            }
        }

        // --- 第六章邏輯 (Stage 6 Logic) ---
        function initStage6() {
            gameMode = 'stage6-intro';
            fadeMusic('stage6');
            
            document.querySelectorAll('.bg-layer').forEach(bg => bg.style.opacity = 0);
            document.getElementById('bg-stage6').style.opacity = 1;
            
            loadStage6Level(1);
        }

        function loadStage6Level(lv) {
            currentLvl = lv;
            const data = stage6Levels[lv];
            scriptQueue = [...stage6Levels[lv].intro];
            scriptIndex = -1;
            
            document.getElementById('terminal-panel').classList.remove('open');
            document.getElementById('dialogue-box').style.display = 'block';
            
            // 重置 UI
            document.getElementById('cup-display').style.display = 'none';
            document.getElementById('sleep-bar').style.display = 'none';
            document.getElementById('conveyor').style.display = 'none';
            document.getElementById('hit-zone').style.display = 'none';
            document.querySelectorAll('.game-btn').forEach(b => b.style.display = 'none');

            // 確保蘇郎立繪隱藏
            document.getElementById('char-surang').style.display = 'none';
            document.getElementById('char-surang').style.opacity = 0;

            // 確保遊戲內蘇郎顯示為睡覺
            const s = document.getElementById('surang-game-obj');
            // 修正：在 6-1, 6-2, 6-3 的劇情階段都隱藏蘇郎，直到小遊戲開始才顯示
            if (lv === 1 || lv === 2 || lv === 3) {
                s.style.display = 'none'; 
            } else {
                s.style.display = 'flex';
                s.style.transform = 'translateX(-50%) scale(0.9) rotate(0deg)';
                s.style.transition = '0.3s';
                document.getElementById('zzz').style.display = 'block';
            }

            // 第六章進度 UI
            document.getElementById('level-title').innerText = data.title;
            document.getElementById('level-title').style.display = 'block';
            const badge = document.getElementById('level-title');
            badge.style.color = '#DE4B4B';
            badge.style.borderLeftColor = '#DE4B4B';
            
            // 顯示第六章遊戲區域
            document.getElementById('stage6-game-area').style.display = 'block';
            
            // 隱藏其他章節 UI
            document.getElementById('stage5-game-area').style.display = 'none';

            currentScript = stage6Levels[lv].intro;
            index = -1;
            nextScript();
        }

        function startMiniGame() {
            document.getElementById('terminal-panel').classList.add('open');
            document.getElementById('dialogue-box').style.display = 'none'; // 修正：確保小遊戲開始時對話框隱藏
            const log = document.getElementById('log-display');
            log.innerHTML = "> System Ready.<br>> Executing Logic...";
            
            if(currentLvl === 1) {
                document.getElementById('cup-display').style.display = 'block';
                document.getElementById('btn-pour').style.display = 'block';
                document.getElementById('task-title').innerText = "FOR LOOP (target: 5)";
                counter = 0;
                
                gameInterval = setInterval(() => {
                    counter++;
                    document.getElementById('cup-display').innerText = `${counter} / 5`;
                    log.innerHTML += `<br>> Pouring tea... i = ${counter}`;
                    log.scrollTop = log.scrollHeight;
                    showBubble(counter <= 5 ? "倒茶..." : "溢出來了！");
                    
                    if(counter > 8) failGame("溢出了！要在剛好 5 杯時停止！");
                }, 600); 

            } else if(currentLvl === 2) {
                document.getElementById('sleep-bar').style.display = 'block';
                document.getElementById('btn-shake').style.display = 'block';
                document.getElementById('task-title').innerText = "WHILE (Sleeping)";
                counter = 100; // Sleep HP
                
                // 確保蘇郎在第二關顯示
                const s = document.getElementById('surang-game-obj');
                s.style.display = 'flex';
                document.getElementById('zzz').style.display = 'block';
                updateSleepBar(); // 初始化進度條顯示

                gameInterval = setInterval(() => {
                    if(counter < 100) counter += 2; 
                    updateSleepBar();
                    const s = document.getElementById('surang-game-obj');
                    s.style.transform = `translateX(-50%) scale(0.9) rotate(${Math.random()*2-1}deg)`;
                }, 100);

            } else if(currentLvl === 3) {
                document.getElementById('conveyor').style.display = 'block';
                document.getElementById('hit-zone').style.display = 'block';
                document.getElementById('btn-break').style.display = 'block';
                document.getElementById('task-title').innerText = "DEFUSE 3 BOMBS";
                
                // 6-3 小遊戲開始時，顯示蘇郎
                document.getElementById('surang-game-obj').style.display = 'flex';
                
                bombsDefused = 0;
                spawnConveyorItems();
            }
        }

        function pourTea() {
            clearInterval(gameInterval);
            if(counter === 5) {
                showBubble("喝茶！");
                document.getElementById('log-display').innerHTML += "<br>> <span style='color:#50fa7b'>SUCCESS: Loop terminated at i=5.</span>";
                document.getElementById('sfx-success').play();
                setTimeout(() => loadStage6Level(2), 1500);
            } else {
                failGame(`失敗！你在 ${counter} 杯時停下了。`);
            }
        }

        function shakeSurang() {
            counter -= 10; // 調整進度條變化
            updateSleepBar();
            showBubble("搖晃！");
            
            const s = document.getElementById('surang-game-obj');
            s.style.transform = `translateX(-50%) scale(1.0) rotate(${Math.random()*10-5}deg)`;
            setTimeout(() => s.style.transform = `translateX(-50%) scale(0.9)`, 50);

            if(counter <= 0) {
                clearInterval(gameInterval);
                document.getElementById('log-display').innerHTML += "<br>> <span style='color:#50fa7b'>SUCCESS: While Loop Condition False.</span>";
                showBubble("...");
                document.getElementById('sfx-success').play();
                document.getElementById('surang-game-obj').style.display = 'none'; // 6-2 結束後隱藏蘇郎
                setTimeout(() => loadStage6Level(3), 1500);
            }
        }

        function updateSleepBar() {
            const fill = document.getElementById('sleep-fill');
            fill.style.width = `${counter}%`;
            if(counter < 30) fill.style.background = "#ff5555";
            else fill.style.background = "#8be9fd";
        }

        function spawnConveyorItems() {
            const itemsQueue = ['🍩', '🍰', '💣', '🧁', '🍩', '💣', '🍰', '🧁', '🍩', '💣', '🍰'];
            let idx = 0;
            
            gameInterval = setInterval(() => {
                if(idx >= itemsQueue.length) { clearInterval(gameInterval); return; }
                const symbol = itemsQueue[idx];
                const item = document.createElement('div');
                item.className = 'conveyor-item';
                item.innerText = symbol;
                item.dataset.type = (symbol === '💣') ? 'bomb' : 'safe';
                document.getElementById('conveyor').appendChild(item);
                setTimeout(() => { item.style.left = '-100px'; }, 50);
                if(symbol === '💣') {
                    item.addEventListener('transitionend', () => { if(document.body.contains(item)) failGame("炸彈爆炸了！睡鼠沒了！不可以！"); });
                } else {
                    item.addEventListener('transitionend', () => { if(item.parentNode) item.remove(); });
                }
                idx++;
            }, 1200); 
        }

        function executeBreak() {
            const zone = document.getElementById('hit-zone').getBoundingClientRect();
            const items = document.querySelectorAll('.conveyor-item');
            let hitBomb = false;
            items.forEach(item => {
                const rect = item.getBoundingClientRect();
                const itemCenter = rect.left + rect.width / 2;
                if (itemCenter > zone.left && itemCenter < zone.right && item.dataset.type === 'bomb') {
                    item.remove(); hitBomb = true; bombsDefused++;
                    showBubble(`讚！(${bombsDefused}/3)`);
                    document.getElementById('log-display').innerHTML += `<br>> <span style='color:#ff5555'>BREAK EXECUTED! Bomb ${bombsDefused}/3 defused.</span>`;
                    if(bombsDefused >= 3) {
                        clearInterval(gameInterval);
                        document.getElementById('log-display').innerHTML += "<br>> <span style='color:#50fa7b'>ALL THREATS ELIMINATED.</span>";
                        document.getElementById('surang-game-obj').style.display = 'none';
                        document.getElementById('sfx-success').play();
                        setTimeout(startStage6Ending, 1000);
                    }
                }
            });
            if(!hitBomb) showBubble("太早或太晚了！");
        }

        function showBubble(text) {
            const b = document.getElementById('game-bubble');
            b.innerText = text; b.style.opacity = 1; b.style.top = "10%";
            setTimeout(() => { b.style.opacity = 0; b.style.top = "15%"; }, 800);
        }

        function failGame(msg) {
            clearInterval(gameInterval);
            showModal("GAME OVER", msg + "\n\n點擊確認重試。", () => {
                document.getElementById('conveyor').innerHTML = '';
                bombsDefused = 0;
                startMiniGame();
            });
        }

        function startStage6Ending() {
            gameMode = 'stage6-success';
            document.getElementById('stage6-game-area').style.display = 'none'; // 隱藏小遊戲介面
            // 顯示蘇郎立繪
            const surangChar = document.getElementById('char-surang');
            surangChar.style.display = 'block';
            surangChar.style.opacity = 1;

            const endScript = [
                { n: "蘇郎", t: "（整理領帶）...系統重啟完成。早安，莉莉絲大人。", chars: [{id:'char-surang', pos:'pos-surang', state:'active'}] },
                { n: "莉莉絲", t: "終於醒了～我要吃那個限量版的星空蛋糕，快點去做。", chars: [{id:'char-lilith', pos:'pos-lilith', state:'active'}] },
                { n: "阿朵菈", t: "（癱軟）太好了... 蘇郎沒壞掉... 剛剛真的嚇死我了...", chars: [{id:'char-adora', pos:'pos-adora', state:'active'}, {id:'char-lilith', pos:'pos-lilith', state:'dim'}] },
                { n: "蘇郎", t: "好，我去做。（轉向克里昂）這份是... 強制喚醒的補償。請收下。", chars: [{id:'char-surang', pos:'pos-surang', state:'active'}] },
                { n: "神器", t: "【第六章 CLEAR】獲得神器：無限續杯茶壺 (Loop)。", chars: [] },
                { n: "克里昂", t: "（接過茶壺）這到底是... 什麼原理？", chars: [{id:'char-kleion', pos:'pos-center', state:'active'}] },
                { n: "哈蘇", t: "這就是我們要修復的「循環邏輯」。有了它，閱兵隊伍才能源源不絕地前進。", chars: [{id:'char-hassel', pos:'pos-center', state:'active'}] },
                { n: "哈蘇", t: "收集進度：6/7。只剩下最後一個組件了。我們走。", chars: [{id:'char-hassel', pos:'pos-center', state:'active'}] }
            ];
            currentScript = endScript;
            index = -1;
            document.getElementById('dialogue-box').style.display = 'block';
            document.getElementById('terminal-panel').classList.remove('open');
            nextScript();
        }
        // --- 第七章邏輯 (Stage 7 Logic) ---
f// --- 修正後的 initStage7 (使用正確的 rose.png) ---
function initStage7() {
    console.log("=== 第七章初始化 (rose.png 版) ===");
    gameMode = 'stage7-intro';
    fadeMusic('stage7'); // 播放第七章音樂

    // 1. 強力清除舊介面 (避免第六章或其他介面殘留)
    const oldUIs = [
        'stage1-game-area', 'stage2-game-area', 'stage3-game-area',
        'stage4-game-area', 'stage5-game-area', 'stage6-game-area',
        'terminal-panel', 'code-editor', 'btn-vision', 'property-panel',
        'char-surang' // 確保蘇郎立繪也被隱藏
    ];
    oldUIs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.style.display = 'none';
            el.classList.remove('open');
        }
    });

    // 2. 隱藏所有背景層 (使用 !important 覆蓋 CSS 的強制顯示)
    document.querySelectorAll('.bg-layer').forEach(bg => {
        bg.style.setProperty('opacity', '0', 'important');
    });

    // 3. 設定並顯示第七章背景 (優先使用 bg-stage7)
    let bg = document.getElementById('bg-stage7');
    if (!bg) bg = document.getElementById('bg-layer'); // Fallback

    if (bg) {
        const bgUrl = "https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%B8%83%E7%AB%A0/rose.png";
        
        bg.style.backgroundImage = `url('${bgUrl}')`;
        bg.style.backgroundSize = 'cover';
        bg.style.backgroundPosition = 'center';
        // 強制顯示 (使用 !important 確保可見)
        bg.style.setProperty('opacity', '1', 'important');
        bg.style.display = "block";
        bg.style.zIndex = "1"; 
    } 

    // 修正：章節開始時重置理智值 (繼承至後續關卡)
    sanity = 100;

    // 4. 載入關卡
    loadStage7Level(1);
}

function loadStage7Level(lv) {
    currentLvl = lv;
    currentWave = 0;
    scriptQueue = [...stage7Levels[lv].intro];
    
    // 重置 UI
    document.getElementById('dialogue-box').style.display = 'block';
    document.getElementById('stage7-game-area').style.display = 'none';
    document.getElementById('sanity-hud').style.display = 'none';
    document.getElementById('brush').style.display = 'none';
    
    // 修正：確保進入關卡(或重試)時，背景回復為正常場景，並清除低理智特效
    let bg = document.getElementById('bg-stage7');
    if (!bg) bg = document.getElementById('bg-layer');
    if (bg) {
        bg.style.backgroundImage = "url('https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%B8%83%E7%AB%A0/rose.png')";
        bg.style.filter = "";
    }

    // 隱藏其他章節 UI
    document.getElementById('stage6-game-area').style.display = 'none';
    document.getElementById('terminal-panel').classList.remove('open');

    // 顯示標題
    document.getElementById('level-title').innerText = stage7Levels[lv].title;
    document.getElementById('level-title').style.display = 'block';
    const badge = document.getElementById('level-title');
    badge.style.color = '#bdc3c7'; // Peter Gray
    badge.style.borderLeftColor = '#c0392b'; // Rose Red

    currentScript = stage7Levels[lv].intro;
    index = -1;
    nextScript();
}

function startStage7Game() {
    document.getElementById('dialogue-box').style.display = 'none';
    document.getElementById('stage7-game-area').style.display = 'block';
    document.getElementById('brush').style.display = 'block';
    document.getElementById('sanity-hud').style.display = 'block';

    // 修正：小遊戲開始時切換背景圖
    let bg = document.getElementById('bg-stage7');
    if (!bg) bg = document.getElementById('bg-layer');
    if (bg) {
        bg.style.backgroundImage = "url('https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%B8%83%E7%AB%A0/llgame.png')";
    }

    // 修正：小遊戲開始時，強制隱藏所有對話立繪 (解決哈蘇卡住問題)
    document.querySelectorAll('.char-img').forEach(img => {
        img.style.opacity = 0;
        img.classList.remove('active', 'dim');
        // 注意：不要設為 display:none，以免引擎後續無法正確淡入
    });
    
    // 修正：只有在失敗(<=0)時才重置，否則繼承上一關的理智值
    if (sanity <= 0) sanity = 100;
    updateSanity();
    resetBrush();
    setupStage7Drag(); // 啟動拖曳
    spawnFlowers();
}

function spawnFlowers() {
    let data;
    if (currentLvl === 3) {
        data = stage7Levels[currentLvl].waves[currentWave];
    } else {
        data = stage7Levels[currentLvl].puzzles;
    }
    
    const container = document.getElementById('stage7-game-area');
    // 清除舊花朵，保留 UI 元素
    const roses = container.querySelectorAll('.rose-wrapper');
    roses.forEach(r => r.remove());

    const positions = [];
    
    data.forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.className = 'rose-wrapper';
        wrapper.id = `rose-${item.id}`;
        
        // 修正：玫瑰花防重疊邏輯與放大
        let x, y, overlap;
        let attempts = 0;
        do {
            overlap = false;
            x = Math.random() * 60 + 10; // 修正：X軸範圍 10%~70% (確保氣泡不超出畫面)
            y = Math.random() * 35 + 30; // 修正：Y軸範圍 30%~65% (避開上下 UI)
            
            for (let p of positions) {
                // 檢查距離 (簡單的歐幾里得距離)
                const dist = Math.sqrt(Math.pow(p.x - x, 2) + Math.pow(p.y - y, 2));
                if (dist < 18) { // 修正：距離閾值設為 18%，配合更廣的生成範圍，減少過度擁擠
                    overlap = true;
                    break;
                }
            }
            attempts++;
        } while (overlap && attempts < 100); // 修正：增加嘗試次數上限
        
        positions.push({x, y});
        
        wrapper.style.left = x + '%';
        wrapper.style.top = y + '%';
        wrapper.style.transform = "scale(1.5)"; // 修正：統一放大玫瑰花 (1.5倍)

        const label = document.createElement('div');
        label.className = 'rose-label';
        label.innerText = item.id;
        
        const rose = document.createElement('div');
        rose.className = 'rose';
        rose.dataset.type = item.type; // 答案藏在這裡
        
        // 點擊顯示氣泡 (優化：點擊切換)
        wrapper.onclick = (e) => {
            e.stopPropagation();
            const wasActive = wrapper.classList.contains('show-bubble');
            document.querySelectorAll('.rose-wrapper').forEach(w => w.classList.remove('show-bubble'));
            if (!wasActive) {
                wrapper.classList.add('show-bubble');
            }
            playClickSound();
        };
        
        const bubble = document.createElement('div');
        bubble.className = 'speech-bubble';
        bubble.innerText = item.text;

        // 修正：依據位置調整氣泡方向，防止超出螢幕
        if (x < 30) bubble.classList.add('bubble-left');
        else if (x > 50) bubble.classList.add('bubble-right');
        
        wrapper.appendChild(bubble);
        wrapper.appendChild(label);
        wrapper.appendChild(rose);
        container.appendChild(wrapper);
    });
}

function updateSanity() {
    document.getElementById('sanity-bar').style.width = sanity + '%';
    
    // 修正：低理智值時的背景特效
    let bg = document.getElementById('bg-stage7');
    if (!bg) bg = document.getElementById('bg-layer');
    if (sanity <= 30) {
        bg.style.filter = "sepia(1) hue-rotate(-50deg) saturate(5) contrast(1.2)"; // 紅色故障風格
    } else {
        bg.style.filter = "";
    }

    if(sanity <= 0) {
        showModal("GAME OVER", "彼得崩潰了！", () => loadStage7Level(currentLvl));
    }
}

// --- 第七章拖曳邏輯 ---
function setupStage7Drag() {
    const b = document.getElementById('brush');
    let isDrag7 = false;
    
    const start = (e) => {
        isDrag7 = true;
        b.style.transition = 'none';
        b.style.cursor = 'grabbing';
        document.getElementById('sfx-drag').play(); // 播放點擊音效
    };

    const move = (e) => {
        if(!isDrag7) return;
        e.preventDefault();
        const touch = e.touches ? e.touches[0] : e;
        const stage = document.getElementById('game-stage').getBoundingClientRect();
        
        let x = touch.clientX - stage.left - 50; // 修正：刷子中心校正 (100px/2 = 50)
        let y = touch.clientY - stage.top - 50;
        
        b.style.left = x + 'px';
        b.style.top = y + 'px';
        b.style.transform = 'none';

        // 修正：單一目標判定邏輯 (只選取最近的一朵)
        const bRect = b.getBoundingClientRect();
        const bCenterX = bRect.left + bRect.width / 2;
        const bCenterY = bRect.top + bRect.height / 2;

        const roses = document.querySelectorAll('.rose');
        let closestRose = null;
        let minDistance = Infinity;

        roses.forEach(rose => {
            if (rose.classList.contains('withered') || rose.classList.contains('painted-red') || rose.classList.contains('painted-gold')) return;

            const rRect = rose.getBoundingClientRect();
            const rCenterX = rRect.left + rRect.width / 2;
            const rCenterY = rRect.top + rRect.height / 2;
            
            const dist = Math.hypot(bCenterX - rCenterX, bCenterY - rCenterY);
            
            // 判定範圍 (例如 80px 內)
            if (dist < 80 && dist < minDistance) {
                minDistance = dist;
                closestRose = rose;
            }
        });

        // 清除舊狀態並套用新狀態
        roses.forEach(r => r.classList.remove('hover-target'));
        if (closestRose) {
            closestRose.classList.add('hover-target');
        }
    };

    const end = (e) => {
        if(!isDrag7) return;
        isDrag7 = false;
        b.style.cursor = 'grab';
        
        checkStage7Hit(); // 修正：先判定是否命中，再清除懸停狀態
        
        // 清除懸停狀態
        document.querySelectorAll('.rose').forEach(r => r.classList.remove('hover-target'));
    };

    b.addEventListener('mousedown', start);
    b.addEventListener('touchstart', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, {passive: false});
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
}

function resetBrush() {
    const b = document.getElementById('brush');
    b.style.transition = '0.5s';
    b.style.top = ''; // 清除 top
    b.style.bottom = '10%'; // 修正：刷子歸位到底部 10%
    b.style.left = '50%';
    b.style.transform = 'translateX(-50%)';
}

function checkStage7Hit() {
    // 修正：直接使用 hover-target 進行判定，確保視覺與邏輯一致
    const target = document.querySelector('.rose.hover-target');
    
    if (target) {
        if (target.dataset.type === 'true') {
            stage7Success(target);
        } else {
            stage7Fail(target);
        }
    } else {
        resetBrush();
    }
}

function stage7Success(rose) {
    const color = stage7Levels[currentLvl].targetColor;
    rose.classList.add(color === 'red' ? 'painted-red' : 'painted-gold');
    document.getElementById('sfx-success').play();
    
    // 新增：播放粒子特效
    createSparkles(rose.getBoundingClientRect());
    
    // 其他花枯萎
    document.querySelectorAll('.rose').forEach(r => {
        if(r !== rose) r.classList.add('withered');
    });

    resetBrush();
    setTimeout(() => {
        if (currentLvl === 3 && currentWave === 0) {
            currentWave++;
            showModal("SYSTEM", "第一波修正完成！還有下一波！", () => spawnFlowers());
        } else {
            showModal("LOGIC CORRECT", "邏輯正確！修正完畢。", () => {
                if(currentLvl < 3) loadStage7Level(currentLvl + 1);
                else startStage7Ending();
            });
        }
    }, 1000);
}

function createSparkles(rect) {
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    for(let i=0; i<15; i++) {
        const s = document.createElement('div');
        s.className = 'sparkle';
        s.style.left = centerX + 'px';
        s.style.top = centerY + 'px';
        
        const angle = Math.random() * Math.PI * 2;
        const dist = 50 + Math.random() * 50;
        const tx = Math.cos(angle) * dist + 'px';
        const ty = Math.sin(angle) * dist + 'px';
        
        s.style.setProperty('--tx', tx);
        s.style.setProperty('--ty', ty);
        s.style.background = Math.random() > 0.5 ? '#ffd700' : '#ffffff';
        s.style.boxShadow = `0 0 5px ${s.style.background}`;
        
        document.body.appendChild(s);
        setTimeout(() => s.remove(), 800);
    }
}

function stage7Fail(rose) {
    rose.classList.add('withered');
    sanity -= 40;
    updateSanity();
    document.getElementById('sfx-warning').play();
    resetBrush();
}

function startStage7Ending() {
    gameMode = 'stage7-success';
    
    // 修正：劇情開始時，切換回第七章正常背景 (rose.png)
    let bg = document.getElementById('bg-stage7');
    if (!bg) bg = document.getElementById('bg-layer');
    if (bg) {
        bg.style.backgroundImage = "url('https://file.garden/aWe99vhwaGcNwkok/%E6%84%9B%E9%BA%97%E7%B5%B2%E6%A8%82%E5%9C%92/%E5%A0%B4%E6%99%AF%E7%BE%8E%E8%A1%93%E7%B4%A0%E6%9D%90/%E7%AC%AC%E4%B8%83%E7%AB%A0/rose.png')";
        bg.style.filter = ""; // 清除可能殘留的低理智濾鏡
    }

    const endScript = [
        { n: "彼得", t: "（癱軟）...完美。沒有雜音，非常吉祥。", chars: [{id:'char-peter', pos:'pos-right', state:'active'}] },
        { n: "林恩", t: "老闆，你的藥效過了。該休息了。", chars: [{id:'char-lynn', pos:'pos-center', state:'active'}, {id:'char-peter', pos:'pos-right', state:'dim'}] },
        { n: "彼得", t: "拿去！（丟出刷子）這把刷子賞給你們了。維納托說這是修復加冕禮的關鍵。", chars: [{id:'char-peter', pos:'pos-right', state:'active'}, {id:'char-lynn', pos:'pos-center', state:'dim'}] },
        { n: "神器", t: "【第七章 CLEAR】獲得神器：皇家油漆刷 (Function)。", chars: [] },
        { n: "哈蘇", t: "有了這個【函數】功能，我們就能將所有修復指令封裝起來，執行最終的重啟了。", chars: [{id:'char-hassel', pos:'pos-center', state:'active'}] },
        { n: "克里昂", t: "終於... 只剩下最後一關了。終於要見到那個傳說中的國王了嗎？", chars: [{id:'char-kleion', pos:'pos-center', state:'active'}] }
    ];
    
    // 確保劇本載入引擎
    if(typeof currentScript !== 'undefined') currentScript = endScript; 
    else window.currentScript = endScript;
    
    if(typeof index !== 'undefined') index = -1; 
    else window.index = -1;
    
    document.getElementById('dialogue-box').style.display = 'block';
    document.getElementById('stage7-game-area').style.display = 'none';
    
    if (typeof nextScript === 'function') nextScript();
}