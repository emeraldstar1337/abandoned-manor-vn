// Gameplay and Point-and-Click Controller
document.addEventListener("DOMContentLoaded", () => {
    let currentState = { ...window.storyData.initialState };
    let currentNodeId = "start";
    let currentDialogueIndex = 0;
    let isTyping = false;
    let typingTimer = null;
    let soundInitialized = false;

    // DOM Elements
    const mainMenu = document.getElementById("main-menu");
    const gameContainer = document.getElementById("game-container");
    const startButton = document.getElementById("start-btn");
    const creditsButton = document.getElementById("credits-btn");
    const creditsModal = document.getElementById("credits-modal");
    const closeCreditsButton = document.getElementById("close-credits");
    
    const bgImage = document.getElementById("game-bg");
    const hotspotsContainer = document.getElementById("hotspots-container");
    const novelCard = document.getElementById("novel-card");
    const sceneTitle = document.getElementById("scene-title");
    const storyText = document.getElementById("story-text");
    const clickPrompt = document.getElementById("click-prompt");
    const choicesContainer = document.getElementById("choices-container");
    
    const inventoryContainer = document.querySelector(".inventory-container");
    const knifeItem = document.getElementById("item-knife");
    const journalItem = document.getElementById("item-journal");
    const crowbarItem = document.createElement("span");
    
    // Setup crowbar item in inventory
    crowbarItem.id = "item-crowbar";
    crowbarItem.className = "inventory-item hidden";
    crowbarItem.innerHTML = "🔧 Монтировка";
    document.getElementById("inventory-list").appendChild(crowbarItem);

    const muteBtn = document.getElementById("mute-btn");
    const volumeSlider = document.getElementById("volume-slider");
    const textSpeedSlider = document.getElementById("text-speed-slider");

    // Audio context initialization trigger
    const initAudio = () => {
        if (!soundInitialized && window.soundEngine) {
            window.soundEngine.init();
            soundInitialized = true;
        }
    };

    // Event Listeners
    startButton.addEventListener("click", () => {
        initAudio();
        if (window.soundEngine) window.soundEngine.playClick();
        
        mainMenu.classList.add("hidden");
        gameContainer.classList.remove("hidden");
        
        loadNode("start");
    });

    creditsButton.addEventListener("click", () => {
        initAudio();
        if (window.soundEngine) window.soundEngine.playClick();
        creditsModal.classList.remove("hidden");
    });

    closeCreditsButton.addEventListener("click", () => {
        if (window.soundEngine) window.soundEngine.playClick();
        creditsModal.classList.add("hidden");
    });

    muteBtn.addEventListener("click", () => {
        initAudio();
        if (window.soundEngine) {
            if (window.soundEngine.isEnabled) {
                window.soundEngine.setVolume(0);
                window.soundEngine.isEnabled = false;
                muteBtn.innerHTML = '<span class="icon">🔇</span> Звук выкл.';
                muteBtn.classList.add("muted");
            } else {
                window.soundEngine.isEnabled = true;
                const vol = parseFloat(volumeSlider.value);
                window.soundEngine.setVolume(vol);
                muteBtn.innerHTML = '<span class="icon">🔊</span> Звук вкл.';
                muteBtn.classList.remove("muted");
            }
            window.soundEngine.playClick();
        }
    });

    volumeSlider.addEventListener("input", (e) => {
        initAudio();
        const val = parseFloat(e.target.value);
        if (window.soundEngine && window.soundEngine.isEnabled) {
            window.soundEngine.setVolume(val);
        }
    });

    // Handle card clicks to advance or skip text
    novelCard.addEventListener("click", (e) => {
        // Prevent clicks on control inputs triggering dialogue advance
        if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
        
        if (isTyping) {
            skipTyping();
        } else {
            advanceDialogue();
        }
    });

    // Core Game Functions
    function loadNode(nodeId) {
        currentNodeId = nodeId;
        currentDialogueIndex = 0;
        const node = window.storyData.nodes[nodeId];
        
        if (!node) {
            console.error(`Story node not found: ${nodeId}`);
            return;
        }

        // Apply node level state actions (only on load, not on dialogue advance)
        if (node.action) {
            node.action(currentState);
        }

        // Clear hotspots & choice triggers
        hotspotsContainer.innerHTML = "";
        choicesContainer.innerHTML = "";
        choicesContainer.classList.add("hidden");

        // Update inventory display
        updateInventory();

        // Update background image
        if (node.image) {
            bgImage.style.opacity = 0.4;
            setTimeout(() => {
                bgImage.style.backgroundImage = `url('assets/${node.image}')`;
                bgImage.style.opacity = 1;
            }, 200);
        }

        // Set Title
        sceneTitle.textContent = node.title;

        // Trigger sounds
        if (window.soundEngine && soundInitialized) {
            if (node.sound) {
                switch(node.sound) {
                    case "jumpscare":
                        window.soundEngine.playJumpscare();
                        break;
                    case "screech":
                        window.soundEngine.playScreech();
                        break;
                    case "thud":
                        window.soundEngine.playThud();
                        break;
                    case "rustle":
                        window.soundEngine.playRustle();
                        break;
                    case "creak":
                        window.soundEngine.playCreak();
                        break;
                    case "slash":
                        window.soundEngine.playSlash();
                        break;
                    default:
                        window.soundEngine.playClick();
                }
            }
            
            // Set heartbeat & whispers drone state
            window.soundEngine.setHeartbeat(node.heartbeat);
            window.soundEngine.setWhispersActive(node.whispers);
        }

        // Load the first paragraph of dialog
        displayParagraph();
    }

    function displayParagraph() {
        const node = window.storyData.nodes[currentNodeId];
        const text = node.dialogues[currentDialogueIndex];
        
        clickPrompt.classList.add("hidden");
        if (typingTimer) clearTimeout(typingTimer);
        storyText.innerHTML = "";
        isTyping = true;
        
        const speed = parseInt(textSpeedSlider.value);
        const textParts = parseHtmlAndText(text);
        let currentPartIndex = 0;
        let charIndex = 0;

        function type() {
            if (currentPartIndex >= textParts.length) {
                finishTyping();
                return;
            }

            const part = textParts[currentPartIndex];
            if (part.type === "tag") {
                storyText.innerHTML += part.content;
                currentPartIndex++;
                type();
            } else {
                if (charIndex < part.content.length) {
                    storyText.innerHTML += part.content[charIndex];
                    charIndex++;
                    // Soft typewriter clicks
                    if (charIndex % 5 === 0 && window.soundEngine && soundInitialized && Math.random() > 0.4) {
                        window.soundEngine.playClick();
                    }
                    typingTimer = setTimeout(type, speed);
                } else {
                    charIndex = 0;
                    currentPartIndex++;
                    type();
                }
            }
        }

        type();
    }

    function parseHtmlAndText(html) {
        const parts = [];
        let i = 0;
        while (i < html.length) {
            if (html[i] === '<') {
                const tagEnd = html.indexOf('>', i);
                if (tagEnd !== -1) {
                    parts.push({
                        type: "tag",
                        content: html.substring(i, tagEnd + 1)
                    });
                    i = tagEnd + 1;
                    continue;
                }
            }
            let nextTag = html.indexOf('<', i);
            if (nextTag === -1) nextTag = html.length;
            parts.push({
                type: "text",
                content: html.substring(i, nextTag)
            });
            i = nextTag;
        }
        return parts;
    }

    function skipTyping() {
        if (typingTimer) clearTimeout(typingTimer);
        const node = window.storyData.nodes[currentNodeId];
        storyText.innerHTML = node.dialogues[currentDialogueIndex];
        finishTyping();
    }

    function finishTyping() {
        isTyping = false;
        const node = window.storyData.nodes[currentNodeId];
        
        if (currentDialogueIndex < node.dialogues.length - 1) {
            // More paragraphs to read, show indicator
            clickPrompt.classList.remove("hidden");
        } else {
            // End of dialogues, render interaction elements
            clickPrompt.classList.add("hidden");
            if (node.hotspots && node.hotspots.length > 0) {
                renderHotspots();
            } else if (node.choices && node.choices.length > 0) {
                renderChoices();
            }
        }
    }

    function advanceDialogue() {
        const node = window.storyData.nodes[currentNodeId];
        if (currentDialogueIndex < node.dialogues.length - 1) {
            currentDialogueIndex++;
            displayParagraph();
        }
    }

    function renderHotspots() {
        hotspotsContainer.innerHTML = "";
        const node = window.storyData.nodes[currentNodeId];
        
        node.hotspots.forEach(hotspot => {
            // Validate hotspot condition
            if (hotspot.condition && !hotspot.condition(currentState)) {
                return;
            }

            const element = document.createElement("div");
            element.className = "hotspot";
            element.style.left = `${hotspot.x}%`;
            element.style.top = `${hotspot.y}%`;
            element.style.width = `${hotspot.w}%`;
            element.style.height = `${hotspot.h}%`;

            const label = document.createElement("div");
            label.className = "hotspot-label";
            label.textContent = hotspot.text;
            element.appendChild(label);

            element.addEventListener("click", (e) => {
                e.stopPropagation(); // Stop dialogue card click
                
                if (window.soundEngine && soundInitialized) {
                    window.soundEngine.playClick();
                }
                
                // Execute state changer if present
                if (hotspot.action) {
                    hotspot.action(currentState);
                }

                loadNode(hotspot.target);
            });

            // Subtle hover hum
            element.addEventListener("mouseenter", () => {
                if (window.soundEngine && soundInitialized) {
                    const osc = window.soundEngine.ctx.createOscillator();
                    const gain = window.soundEngine.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(320, window.soundEngine.ctx.currentTime);
                    gain.gain.setValueAtTime(0.015, window.soundEngine.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, window.soundEngine.ctx.currentTime + 0.08);
                    osc.connect(gain);
                    gain.connect(window.soundEngine.masterVolume);
                    osc.start();
                    osc.stop(window.soundEngine.ctx.currentTime + 0.09);
                }
            });

            hotspotsContainer.appendChild(element);
        });
    }

    function renderChoices() {
        choicesContainer.innerHTML = "";
        choicesContainer.classList.remove("hidden");
        const node = window.storyData.nodes[currentNodeId];
        
        node.choices.forEach(choice => {
            if (choice.condition && !choice.condition(currentState)) {
                return;
            }

            const button = document.createElement("button");
            button.className = "choice-btn";
            button.innerHTML = choice.text;
            
            button.addEventListener("click", (e) => {
                e.stopPropagation();
                if (window.soundEngine && soundInitialized) {
                    window.soundEngine.playClick();
                }
                if (choice.resetState) {
                    currentState = { ...window.storyData.initialState };
                }
                loadNode(choice.target);
            });

            choicesContainer.appendChild(button);
        });
    }

    function updateInventory() {
        let hasItems = false;
        
        if (currentState.has_knife) {
            knifeItem.classList.remove("hidden");
            hasItems = true;
        } else {
            knifeItem.classList.add("hidden");
        }

        if (currentState.read_magazines) {
            journalItem.classList.remove("hidden");
            hasItems = true;
        } else {
            journalItem.classList.add("hidden");
        }

        if (currentState.has_crowbar) {
            crowbarItem.classList.remove("hidden");
            hasItems = true;
        } else {
            crowbarItem.classList.add("hidden");
        }

        if (hasItems) {
            inventoryContainer.classList.remove("hidden");
        } else {
            inventoryContainer.classList.add("hidden");
        }
    }
});
