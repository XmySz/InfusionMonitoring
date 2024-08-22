let patientCount = 1;
let modalData = {};   // 全局对象，用于存储每个模态窗口的响应数据里表格相关的部分
let patientData = {};
let deviceStatuses = {};

function allCardsInUse() {
    const cards = document.querySelectorAll('.card:not(.add-card)');
    for (let card of cards) {
        if (!card.classList.contains('infusion-started')) {
            return false;
        }
    }
    return true;
}

function scanDevice(modalId) {
    const modalElement = document.getElementById(modalId);
    let deviceNumber = modalElement.querySelector('.deviceNumber').value;
    if (!deviceNumber) {
        alert('请输入设备号');
        return;
    }

    const deviceMapping = {
        '5': "025B37A41CBF",
        '6': "025B37A41EA7",
        '1': "025B37A41EAF",
        '2': "025B37A41E99"
    };

    deviceNumber = deviceMapping[deviceNumber] || deviceNumber;

    // 发送AJAX请求到后端
    fetch(`/api/scan-device/${deviceNumber}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                modalElement.querySelector('.lockSwitch').value = data.sbflag;
                modalElement.querySelector('.batteryLevel').value = data.dl;

                // 保存设备状态
                deviceStatuses[modalId] = {
                    deviceNumber: deviceNumber,
                    lockSwitch: data.sbflag
                };

                // 开始实时监测
                startDeviceMonitoring(modalId);
            } else {
                alert('未找到设备信息');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('扫描设备时出错');
        });
}

function scanPatientId(modalId) {
    const modalElement = document.getElementById(modalId);
    const patientID = modalElement.querySelector('.patientID').value;

    if (!patientID) {
        alert('请输入患者住院号');
        return;
    }

    // 发送AJAX请求到后端
    fetch(`/api/scan-patient-zy/${patientID}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                patientData = data;

                modalElement.querySelector('.name').value = data.XM;
                modalElement.querySelector('.gender').value = data.sex;
                modalElement.querySelector('.age').value = data.age;
                modalElement.querySelector('.department').value = data.KS;
                modalElement.querySelector('.bed-no').value = data.bed_no;

                // 处理药品组号
                const medicineGroupSelect = modalElement.querySelector('.medicineGroup');
                medicineGroupSelect.innerHTML = '<option value="">住院号扫描后请选择</option>';
                Object.entries(data.record_sn_data).forEach(([record_sn, medicines]) => {
                    const option = document.createElement('option');
                    option.value = record_sn;

                    // 创建选项文本，包含record_sn和药品名称
                    const medicineNames = medicines.map(med => med.yp_name).join('——');
                    option.textContent = `${record_sn}: ${medicineNames}`;

                    medicineGroupSelect.appendChild(option);
                });

                medicineGroupSelect.addEventListener('change', function () {
                    updateUsage(modalId, this.value);
                });

                // 保存所有 record_sn 值
                modalData[modalId] = {
                    allRecordSns: Object.keys(data.record_sn_data),
                    selectedRecordSn: null
                };

            } else {
                alert('未找到患者信息');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('扫描患者信息时出错');
        });
}

function updateUsage(modalId, selectedRecordSn) {
    const modalElement = document.getElementById(modalId);
    const selectedData = patientData.record_sn_data[selectedRecordSn];

    if (selectedData && selectedData.length > 0) {
        // 更新用法字段
        modalElement.querySelector('.usage').value = selectedData[0].yf;

        // 保存数据以供后续使用
        modalData[modalId] = {
            selectedRecordSn: selectedRecordSn,
            medicineData: selectedData
        };
    }
}

function startInfusion(modalId, cardId) {
    // 给卡片添加开始输液类
    document.getElementById(cardId).classList.add('infusion-started');

    let modal = document.getElementById(modalId);

    const now = new Date();
    modal.querySelector('.startTime').value = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    // 收集模态窗口中的数据
    const department = modal.querySelector('.department').value;
    const patientID = modal.querySelector('.patientID').value;
    const name = modal.querySelector('.name').value;
    const gender = modal.querySelector('.gender').value;
    const age = modal.querySelector('.age').value;
    const usage = modal.querySelector('.usage').value;
    const dropRate = modal.querySelector('.dropRate').value;
    const startTime = modal.querySelector('.startTime').value;
    const bed_no = modal.querySelector('.bed-no').value;

    // 根据住院号和药品组号更新表格显示内容
    if (modalData[modalId] && modalData[modalId].selectedRecordSn) {
        updateMedicineTable(cardId, modalData[modalId].medicineData);
    } else {
        alert('请先选择药品组号');
        return;
    }

    // 如果没有收集到滴速则不能开始
    if (!dropRate) {
        alert("请输入滴速！");
        return;
    }

    // 关闭模态窗口
    closeModal(modalId);

    let maxDosage = Math.max(...modalData[modalId].medicineData.map(medicine => medicine.dosage));    // 输液背景改变， 液体余量更新
    simulateRealTimeUpdate(cardId, maxDosage, modalId, dropRate);

    // 更新卡片信息
    updateCard(cardId, {
        department,
        patientID,
        name,
        gender,
        age,
        usage,
        dropRate,
        startTime,
        bed_no,
    });
}

function updateMedicineTable(patientId, medicineData) {
    const patientElement = document.getElementById(patientId);
    const tableBody = patientElement.querySelector('.popup tbody');
    tableBody.innerHTML = '';

    medicineData.forEach(medicine => {
        const row = tableBody.insertRow();
        row.innerHTML = `
            <td>${medicine.yp_name}</td>
            <td>${medicine.specification}</td>
            <td>${medicine.charge_amount}</td>
            <td>${medicine.dosage}</td>
            <td>${medicine.dw}</td>
            <td>${medicine.print_name}</td>
            <td>${medicine.yf}</td>
        `;
    });
}

function updateCard(cardId, data) {
    const card = document.getElementById(cardId);
    if (card) {
        card.querySelector('.department').textContent = data.department;
        card.querySelector('.patient-id').textContent = data.patientID;
        card.querySelector('.patient-info').textContent = `${data.name} ${data.gender} ${data.age}`;
        card.querySelector('.usage').textContent = `${data.usage}`;
        card.querySelector('.drop-rate').textContent = `${data.dropRate}`;
        card.querySelector('.bed-no').textContent = `${data.bed_no}`;
        card.querySelector('.start-time').textContent = `${data.startTime}`;

        // 更新卡片状态
        card.classList.add('infusion-started');
    }
}

function addCard() {
    // if (!allCardsInUse()) {
    //     alert('请先使用所有现有的卡片后再添加新卡片。');
    //     return;
    // }

    const content = document.querySelector('.content');
    const addCard = document.querySelector('.add-card');

    patientCount++;

    const cardId = `patient${patientCount}`;
    const modalId = `patient${patientCount}Modal`;

    // 创建新卡片
    const newCard = document.createElement('div');
    newCard.className = 'card';
    newCard.id = cardId;
    newCard.innerHTML = `
            <div class="liquid-overlay"></div>
            <div class="card-content">
                科室: <span class="department"></span><br>
                住院号: <span class="patient-id"></span><br>
                床号: <span class="bed-no"></span><br>
                患者信息: <span class="patient-info"></span><br>
                用法: <span class="usage"></span><br>
                滴速: <span class="drop-rate"></span><br>
                开始时间: <span class="start-time"></span>
                <p class="liquid-info">估计液体余量: <span class="liquid-amount"></span></p>
            </div>
            <div class="popup">
                <table>
                    <thead>
                        <tr>
                            <th>药品名称</th>
                            <th>规格</th>
                            <th>数量</th>
                            <th>用量</th>
                            <th>单位</th>
                            <th>次数</th>
                            <th>用法</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- 药品信息将在这里动态插入 -->
                    </tbody>
                </table>
            </div>
    `;
    newCard.ondblclick = () => showModal(modalId);

    newCard.style.zIndex = 1000 - patientCount;
    content.insertBefore(newCard, addCard);
    addHoverListeners(newCard);

    // 创建新的设备绑定窗口
    const newModal = document.createElement('div');
    newModal.id = modalId;
    newModal.className = 'modal';
    newModal.innerHTML = `
        <div class="modal-content">
            <span class="close">&times;</span>
            <h3 style="text-align: center; margin: 10px;">绑定患者与设备</h3>
            <div class="form-row">
                <label for="deviceNumber">设备号：</label>
                <input type="text" class="deviceNumber">
                <button class="device-scan-button">扫描</button>
            </div>
            <div class="form-row">
                <label for="lockSwitch">锁开关：</label>
                <input type="text" class="lockSwitch" readonly placeholder="设备号扫描后自动生成">
            </div>
            <div class="form-row">
                <label for="batteryLevel">电量：</label>
                <input type="text" class="batteryLevel" readonly placeholder="设备号扫描后自动生成">
            </div>
            <div class="form-row">
                <label for="patientID">住院号：</label>
                <input type="text" class="patientID">
                <button class="patient-id-scan-button">扫描</button>
            </div>
            <div class="form-row">
                <label for="medicineGroup">药品组号：</label>
                <div class="medicine-group-container">
                    <select class="medicineGroup">
                        <option value="">请选择药品组号</option>
                    </select>
                    <div class="medicine-info-tooltip"></div>
                </div>
            </div>
            <div class="form-row">
                <label for="name">姓名：</label>
                <input type="text" class="name" readonly placeholder="住院号扫描后自动生成">
            </div>
            <div class="form-row">
                <label for="gender">性别：</label>
                <input type="text" class="gender" readonly placeholder="住院号扫描后自动生成">
            </div>
            <div class="form-row">
                <label for="age">年龄：</label>
                <input type="text" class="age" readonly placeholder="住院号扫描后自动生成">
            </div>
            <div class="form-row">
                <label for="department">科室：</label>
                <input type="text" class="department" readonly placeholder="住院号扫描后自动生成">
            </div>
            <div class="form-row">
                <label for="bed-no">床号：</label>
                <input type="text" class="bed-no" readonly placeholder="住院号扫描后自动生成">
            </div>
            <div class="form-row">
                <label for="temperature">体温：</label>
                <input type="text" class="temperature" placeholder="请填写">
            </div>
            <div class="form-row">
                <label for="dropRate">滴速：</label>
                <input type="text" class="dropRate" placeholder="请填写，__滴/分钟" value="60">
            </div> 
            <div class="form-row">
                <label for="usage">用法：</label>
                <input type="text" class="usage" placeholder="选中药品组号后自动生成">
            </div>
            <div class="form-row">
                <label for="startTime">开始时间：</label>
                <input type="text" class="startTime" readonly placeholder="设备号扫描后自动生成">
            </div>
            <div style="text-align: center;">
                <button class="button-start-infusion startInfusionButton">开始输液</button>
            </div>
        </div>
    `;
    document.body.appendChild(newModal);
    newModal.querySelector('.close').onclick = () => closeModal(modalId);
    newModal.querySelector('.device-scan-button').onclick = () => scanDevice(modalId);
    newModal.querySelector('.patient-id-scan-button').onclick = () => scanPatientId(modalId);
    newModal.querySelector('.startInfusionButton').onclick = () => startInfusion(modalId, cardId);

    setTimeout(() => {
        newCard.classList.remove('new-card');
    }, 500);
}

function addHoverListeners(card) {
    const popup = card.querySelector('.popup');
    let hoverTimer;

    card.addEventListener('mouseenter', () => {
        hoverTimer = setTimeout(() => {
            popup.classList.add('show');
        }, 1000);
    });

    card.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimer);
        popup.classList.remove('show');
    });
}

function showModal(modalId) {
    document.getElementById(modalId).style.display = "block";
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = "none";
}

function updateLiquidAmount(cardId, amount, modalId) {
    const card = document.getElementById(cardId);
    const liquidAmount = card.querySelector('.liquid-amount');
    const liquidOverlay = card.querySelector('.liquid-overlay');

    let amountScale = 100 * (amount / Math.max(...modalData[modalId].medicineData.map(medicine => medicine.dosage)));
    if (80 < amountScale && amountScale <= 100) {
        liquidAmount.textContent = `80%~100%`;
    }
    else if (60 < amountScale && amountScale <= 80) {
        liquidAmount.textContent = `60%~80%`;
    }
    else if (40 < amountScale && amountScale <= 60) {
        liquidAmount.textContent = `40%~60%`;
    }
    else if (20 < amountScale && amountScale <= 40) {
        liquidAmount.textContent = `20%~40%`;
    }
    else if (0 < amountScale && amountScale <= 20) {
        liquidAmount.textContent = `0%~20%`;
    }
    liquidOverlay.style.height = `${100 - 100 * (amount / Math.max(...modalData[modalId].medicineData.map(medicine => medicine.dosage)))}%`;

    // if (amount <= 0 || (deviceStatuses[modalId] && deviceStatuses[modalId].lockSwitch == "已锁死!")) {
    if (amount <= 0) {
        showCompletionMessage(card);
        completeInfusion(modalId);
        document.getElementById(modalId).querySelector('.lockSwitch').value = "已锁死!";
        console.log(`停止输液：${modalId}`);
    }
}

function showCompletionMessage(card) {
    const message = document.createElement('div');
    message.className = 'completion-message';
    message.textContent = '输液完成！';
    card.appendChild(message);

    setTimeout(() => {
        message.style.opacity = '0.95';
        message.style.zIndex = '1002';
    }, 50);
}

function simulateRealTimeUpdate(cardId, dosage, modalId, dropRate) {
    let amount = dosage;
    const interval = setInterval(() => {
        amount -= (0.05 * (dropRate / 60));
        updateLiquidAmount(cardId, amount, modalId);
        if ((amount <= 0) || ((deviceStatuses[modalId] && deviceStatuses[modalId].lockSwitch == "已锁死!"))) {
            clearInterval(interval);
        }
    }, 1000); // 每秒更新一次
}

function completeInfusion(modalId) {
    const modalElement = document.getElementById(modalId);
    const patientID = modalElement.querySelector('.patientID').value;
    const selectedRecordSn = modalData[modalId]['selectedRecordSn'];

    // 调用 API 更新 ZyRecord
    fetch('/api/update_zyrecord/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            record_sn: selectedRecordSn,
            p_id: patientID
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('ZyRecord 更新成功:', data.message);
            } else {
                console.error('SyRecord 更新失败:', data.message);
            }
        })
        .catch(error => {
            console.error('更新 SyRecord 时发生错误:', error);
        });
}

function startDeviceMonitoring(modalId) {
    // 假设每5秒检查一次设备状态
    const cardId = modalId.replace('Modal', '');
    const Interval = setInterval(() => {
        const deviceNumber = deviceStatuses[modalId].deviceNumber;
        fetch(`/api/check-device-status/${deviceNumber}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    deviceStatuses[modalId].lockSwitch = data.sbflag;
                    if (data.sbflag == "已锁死!") {
                        clearInterval(Interval);
                        showLockOverlay(cardId, modalId);
                    }
                }
            })
            .catch(error => {
                console.error('Error checking device status:', error);
            });
    }, 1000);
}

// 处理第一个卡片的事件
document.getElementById('patient1').ondblclick = () => showModal('patient1Modal');
document.querySelector('#patient1Modal .close').onclick = () => closeModal('patient1Modal');
document.querySelector('#patient1Modal .device-scan-button').onclick = () => scanDevice('patient1Modal');
document.querySelector('#patient1Modal .patient-id-scan-button').onclick = () => scanPatientId('patient1Modal');
document.querySelector('#patient1Modal .startInfusionButton').onclick = () => startInfusion('patient1Modal', 'patient1');
addHoverListeners(document.getElementById('patient1'));

// 持久化存储

// 保存数据到 localStorage
function saveData() {
    const dataToSave = {
        modalDatas: [],
        cards: [],
        modalData: {},
        deviceStatuses: {},
    };

    // 保存每个卡片的数据（包含静止时显示的药品表）
    document.querySelectorAll('.card:not(.add-card)').forEach(card => {
        const cardId = card.id;

        const cardData = {
            id: cardId,
            department: card.querySelector('.department').textContent,
            patientID: card.querySelector('.patient-id').textContent,
            patientInfo: card.querySelector('.patient-info').textContent,
            usage: card.querySelector('.usage').textContent,
            dropRate: card.querySelector('.drop-rate').textContent,
            bedNo: card.querySelector('.bed-no').textContent,
            startTime: card.querySelector('.start-time').textContent,
            liquidAmount: card.querySelector('.liquid-amount').textContent,
            isInfusionStarted: card.classList.contains('infusion-started'),
            liquidOverlayHeight: card.querySelector('.liquid-overlay').style.height,
            modalId: `${cardId}Modal`,
            popupData: []
        };

        // Save popup table data
        card.querySelectorAll('.popup tbody tr').forEach(row => {
            cardData.popupData.push({
                ypName: row.cells[0].textContent,
                specification: row.cells[1].textContent,
                chargeAmount: row.cells[2].textContent,
                dosage: row.cells[3].textContent,
                dw: row.cells[4].textContent,
                printName: row.cells[5].textContent,
                yf: row.cells[6].textContent
            });
        });

        dataToSave.cards.push(cardData);
    });

    // 保存每个modal的数据
    document.querySelectorAll('.modal').forEach(modal => {
        const modalId = modal.id;
        const modalData = {
            id: modalId,
            deviceNumber: modal.querySelector('.deviceNumber').value,
            lockSwitch: modal.querySelector('.lockSwitch').value,
            batteryLevel: modal.querySelector('.batteryLevel').value,
            patientID: modal.querySelector('.patientID').value,
            medicineGroup: modal.querySelector('.medicineGroup').textContent,
            name: modal.querySelector('.name').value,
            gender: modal.querySelector('.gender').value,
            age: modal.querySelector('.age').value,
            department: modal.querySelector('.department').value,
            bed_no: modal.querySelector('.bed-no').value,
            temperature: modal.querySelector('.temperature').value,
            dropRate: modal.querySelector('.dropRate').value,
            usage: modal.querySelector('.usage').value,
            startTime: modal.querySelector('.startTime').value,
        }
        dataToSave.modalDatas.push(modalData);
    });

    // 保存 modalData
    for (let key in modalData) {
        dataToSave.modalData[key] = {
            selectedRecordSn: modalData[key].selectedRecordSn,
            medicineData: modalData[key].medicineData,
            allRecordSns: modalData[key].allRecordSns
        };
    }

    // 保存 deviceStatuses
    for (let key in deviceStatuses) {
        dataToSave.deviceStatuses[key] = deviceStatuses[key];
    }

    localStorage.setItem('infusionSystemData', JSON.stringify(dataToSave));
}

function loadData() {
    const savedData = localStorage.getItem('infusionSystemData');
    if (savedData) {
        const parsedData = JSON.parse(savedData);

        // 解析modalData数据
        modalData = parsedData.modalData || {};

        // 解析card数据
        parsedData.cards.forEach(cardData => {
            if (cardData.id !== 'patient1') {
                addCard();
            }
            const card = document.getElementById(cardData.id);
            if (card) {
                card.querySelector('.department').textContent = cardData.department;
                card.querySelector('.patient-id').textContent = cardData.patientID;
                card.querySelector('.patient-info').textContent = cardData.patientInfo;
                card.querySelector('.usage').textContent = cardData.usage;
                card.querySelector('.drop-rate').textContent = cardData.dropRate;
                card.querySelector('.bed-no').textContent = cardData.bedNo;
                card.querySelector('.start-time').textContent = cardData.startTime;
                card.querySelector('.liquid-amount').textContent = cardData.liquidAmount;
                card.querySelector('.liquid-overlay').style.height = cardData.liquidOverlayHeight;

                if (cardData.isInfusionStarted) {
                    card.classList.add('infusion-started');
                    const modalId = cardData.id + 'Modal';

                    if (modalData[modalId] && modalData[modalId].medicineData) {
                        let initialDosage = Math.max(...modalData[modalId].medicineData.map(medicine => medicine.dosage)); 
                        const currentPercentage = parseFloat(cardData.liquidOverlayHeight) / 100;
                        const currentDosage = initialDosage * (1 - currentPercentage);

                        // 重新启动输液模拟
                        simulateRealTimeUpdate(cardData.id, currentDosage, modalId, parseFloat(cardData.dropRate));
                    }
                }

                const tableBody = card.querySelector('.popup tbody');
                tableBody.innerHTML = '';
                cardData.popupData.forEach(rowData => {
                    const row = tableBody.insertRow();
                    row.innerHTML = `
                        <td>${rowData.ypName}</td>
                        <td>${rowData.specification}</td>
                        <td>${rowData.chargeAmount}</td>
                        <td>${rowData.dosage}</td>
                        <td>${rowData.dw}</td>
                        <td>${rowData.printName}</td>
                        <td>${rowData.yf}</td>
                    `;
                });
            }
        });

        // 解析modal数据
        let modalDatas = parsedData.modalDatas;
        modalDatas.forEach(
            modalData => {
                const modal = document.getElementById(modalData.id);
                modal.querySelector('.deviceNumber').value = modalData.deviceNumber;
                modal.querySelector('.lockSwitch').value = modalData.lockSwitch;
                modal.querySelector('.batteryLevel').value = modalData.batteryLevel;
                modal.querySelector('.patientID').value = modalData.patientID;
                modal.querySelector('.medicineGroup option').textContent = modalData.medicineGroup;
                modal.querySelector('.name').value = modalData.name;
                modal.querySelector('.gender').value = modalData.gender;
                modal.querySelector('.age').value = modalData.age;
                modal.querySelector('.department').value = modalData.department;
                modal.querySelector('.bed-no').value = modalData.bed_no;
                modal.querySelector('.temperature').value = modalData.temperature;
                modal.querySelector('.dropRate').value = modalData.dropRate;
                modal.querySelector('.usage').value = modalData.usage;
                modal.querySelector('.startTime').value = modalData.startTime;
            }
        )
    }
}

window.addEventListener('load', loadData);

window.addEventListener('beforeunload', saveData);

function showLockOverlay(cardId, modalId) {
    const card = document.getElementById(cardId);
    const lockOverlay = document.createElement('div');
    lockOverlay.className = 'lock-overlay';
    lockOverlay.innerHTML = `
        <div class="lock-message">锁已关上</div>
        <div class="lock-buttons">
            <button class="continue-infusion">继续输液</button>
            <button class="complete-infusion">输液完成</button>
        </div>
    `;
    card.appendChild(lockOverlay);

    // 添加按钮事件监听器
    lockOverlay.querySelector('.continue-infusion').addEventListener('click', () => {
        continueLockInfusion(cardId, modalId);
    });
    lockOverlay.querySelector('.complete-infusion').addEventListener('click', () => {
        completeLockInfusion(cardId, modalId);
    });
}

function continueLockInfusion(cardId, modalId) {
    // 移除锁定覆盖层
    const lockOverlay = document.querySelector(`#${cardId} .lock-overlay`);
    if (lockOverlay) {
        lockOverlay.remove();
    }

    // 继续输液逻辑
    deviceStatuses[modalId].lockSwitch = "正在监控...";
    startDeviceMonitoring(modalId);

    // 重新启动输液模拟
    let card = document.getElementById(cardId)
    const dropRate = card.querySelector('.drop-rate').textContent;
    const initialDosage = Math.max(...modalData[modalId].medicineData.map(medicine => medicine.dosage));;
    const currentPercentage = parseFloat(card.querySelector('.liquid-overlay').style.height) / 100;
    const currentDosage = initialDosage * (1 - currentPercentage);

    // 重新启动输液模拟
    simulateRealTimeUpdate(cardId, currentDosage, modalId, parseFloat(dropRate));
}

function completeLockInfusion(cardId, modalId) {
    // 移除锁定覆盖层
    const lockOverlay = document.querySelector(`#${cardId} .lock-overlay`);
    if (lockOverlay) {
        lockOverlay.remove();
    }

    document.getElementById(cardId).querySelector('.liquid-overlay').style.height = '%0'

    // 显示输液完成消息
    showCompletionMessage(document.getElementById(cardId));

    // 完成输液逻辑
    completeInfusion(modalId);


}

// 025B37A41E9F 360906