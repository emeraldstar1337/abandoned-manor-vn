// Game Controller for the Visual Novel
document.addEventListener("DOMContentLoaded", () => {
    let currentState = { ...window.storyData.initialState };
    let currentNodeId = "start";
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
    const sceneTitle = document.getElementById("scene-title");
    const storyText = document.getElementById("story-text");
    const choicesContainer = document.getElementById("choices-container");
    
    const inventoryList = document.getElementById("inventory-list");
    const knifeItem = document.getElementById("item-knife");
    const journalItem = document.getElementById("item-journal");
    
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

    // Handle full-screen clicks to speed up typing
    storyText.addEventListener("click", () => {
        if (isTyping) {
            skipTyping();
        }
    });

    // Core Game Functions
    function loadNode(nodeId) {
        currentNodeId = nodeId;
        const node = window.storyData.nodes[nodeId];
        
        if (!node) {
            console.error(`Story node not found: ${nodeId}`);
            return;
        }

        // Apply any node actions
        if (node.action) {
            node.action(currentState);
        }

        // Update inventory display
        updateInventory();

        // Update background image
        if (node.image) {
            // Apply a nice fade transition for the background
            bgImage.style.opacity = 0;
            setTimeout(() => {
                bgImage.style.backgroundImage = `url('assets/${node.image}')`;
                bgImage.style.opacity = 1;
            }, 300);
        }

        // Update title
        sceneTitle.textContent = node.title;

        // Play Node Sound
        if (window.soundEngine && soundInitialized) {
            // Play custom sfx
            if (node.sound) {
                switch(node.sound) {
                    case "jumpscare":
                        window.soundEngine.playJumpscare();
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
            
            // Set heartbeat pace
            window.soundEngine.setHeartbeat(node.heartbeat);
        }

        // Start text display (Typewriter effect)
        displayText(node.text);
    }

    function displayText(text) {
        // Clear choices during typing
        choicesContainer.innerHTML = "";
        choicesContainer.classList.add("hidden");
        
        if (typingTimer) clearInterval(typingTimer);
        storyText.innerHTML = "";
        isTyping = true;
        
        let i = 0;
        const speed = parseInt(textSpeedSlider.value); // ms per char (lower = faster)
        
        // Handle HTML tags safely inside the typewriter effect
        const textParts = parseHtmlAndText(text);
        let currentTextPartIndex = 0;
        let charIndex = 0;

        function type() {
            if (currentTextPartIndex >= textParts.length) {
                finishTyping();
                return;
            }

            const part = textParts[currentTextPartIndex];
            if (part.type === "tag") {
                storyText.innerHTML += part.content;
                currentTextPartIndex++;
                type(); // run immediately for tags
            } else {
                if (charIndex < part.content.length) {
                    storyText.innerHTML += part.content[charIndex];
                    charIndex++;
                    // Play subtle text click sound occasionally
                    if (charIndex % 4 === 0 && window.soundEngine && soundInitialized && Math.random() > 0.4) {
                        // Very soft click
                        window.soundEngine.playClick();
                    }
                    typingTimer = setTimeout(type, speed);
                } else {
                    charIndex = 0;
                    currentTextPartIndex++;
                    type();
                }
            }
        }

        type();
    }

    // Parse HTML string into arrays of text fragments and tags to animate text properly
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
        storyText.innerHTML = node.text;
        finishTyping();
    }

    function finishTyping() {
        isTyping = false;
        choicesContainer.classList.remove("hidden");
        renderChoices();
    }

    function renderChoices() {
        choicesContainer.innerHTML = "";
        const node = window.storyData.nodes[currentNodeId];
        
        node.choices.forEach(choice => {
            // Check condition if present
            if (choice.condition && !choice.condition(currentState)) {
                return; // skip choices that don't meet condition
            }

            const button = document.createElement("button");
            button.className = "choice-btn";
            button.innerHTML = choice.text;
            
            button.addEventListener("click", () => {
                if (window.soundEngine && soundInitialized) {
                    window.soundEngine.playClick();
                }
                
                if (choice.resetState) {
                    currentState = { ...window.storyData.initialState };
                }
                
                loadNode(choice.target);
            });

            // Hover sound effect
            button.addEventListener("mouseenter", () => {
                if (window.soundEngine && soundInitialized) {
                    // Very soft hover click
                    const osc = window.soundEngine.ctx.createOscillator();
                    const gain = window.soundEngine.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(400, window.soundEngine.ctx.currentTime);
                    gain.gain.setValueAtTime(0.01, window.soundEngine.ctx.currentTime);
                    gain.gain.exponentialRampToValueAtTime(0.001, window.soundEngine.ctx.currentTime + 0.05);
                    osc.connect(gain);
                    gain.connect(window.soundEngine.masterVolume);
                    osc.start();
                    osc.stop(window.soundEngine.ctx.currentTime + 0.06);
                }
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

        if (hasItems) {
            inventoryList.parentElement.classList.remove("hidden");
        } else {
            inventoryList.parentElement.classList.add("hidden");
        }
    }
});
