let patientCount = 1;
let currentEditingCardId = null;
let modalData = {};   // 全局对象，用于存储每个模态窗口的响应数据里表格相关的部分
let patientData = {};
let deviceStatuses = {};
let tooltipTimer;


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
    const deviceNumber = modalElement.querySelector('.deviceNumber').value;
    if (!deviceNumber) {
        alert('请输入设备号');
        return;
    }

    // 发送AJAX请求到后端
    fetch(`/api/scan-device/${deviceNumber}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                modalElement.querySelector('.lockSwitch').value = data.sbflag;
                modalElement.querySelector('.batteryLevel').value = data.dl;
                modalElement.querySelector('.startTime').value = data.create_date;
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
        alert('请输入门诊号');
        return;
    }

    // 发送AJAX请求到后端
    fetch(`/api/scan-patient-mz/${patientID}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                patientData = data;

                modalElement.querySelector('.name').value = data.p_name;
                modalElement.querySelector('.gender').value = data.sex;
                modalElement.querySelector('.age').value = data.age;
                modalElement.querySelector('.department').value = data.ks;
                
                // 处理药品组号
                const medicineGroupSelect = modalElement.querySelector('.medicineGroup');
                medicineGroupSelect.innerHTML = '<option value="">门诊号扫描后请选择</option>';
                Object.keys(data.record_sn_data).forEach(record_sn => {
                    const option = document.createElement('option');
                    option.value = record_sn;
                    option.textContent = record_sn;
                    medicineGroupSelect.appendChild(option);
                });
                medicineGroupSelect.addEventListener('change', function() {
                    updateUsage(modalId, this.value);
                });
                // 添加鼠标悬停事件
                medicineGroupSelect.addEventListener('mouseover', function(e) {
                    if (e.target.value) {
                        clearTimeout(tooltipTimer);
                        tooltipTimer = setTimeout(() => showMedicineInfo(modalId, e.target.value), 1000);
                    }
                });
                medicineGroupSelect.addEventListener('mouseout', function() {
                    clearTimeout(tooltipTimer);
                    hideMedicineInfo(modalId);
                });
                medicineGroupSelect.addEventListener('change', function() {
                    clearTimeout(tooltipTimer);
                    hideMedicineInfo(modalId);
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

function showMedicineInfo(modalId, recordSn) {
    const modalElement = document.getElementById(modalId);
    const tooltip = modalElement.querySelector('.medicine-info-tooltip');
    const medicineData = patientData.record_sn_data[recordSn];

    if (medicineData && medicineData.length > 0) {
        let infoHTML = '<ul>';
        medicineData.forEach(medicine => {
            infoHTML += `<li>${medicine.yp_name} - ${medicine.specification} - ¥${medicine.charge_price}</li>`;
        });
        infoHTML += '</ul>';
        tooltip.innerHTML = infoHTML;
        tooltip.style.display = 'block';
    }
}

function hideMedicineInfo(modalId) {
    const modalElement = document.getElementById(modalId);
    const tooltip = modalElement.querySelector('.medicine-info-tooltip');
    tooltip.style.display = 'none';
}

function startInfusion(modalId, cardId) {
    // 给卡片添加开始输液类
    document.getElementById(cardId).classList.add('infusion-started');

    let modal = document.getElementById(modalId);

    // 收集模态窗口中的数据
    const department = modal.querySelector('.department').value;
    const patientID = modal.querySelector('.patientID').value;
    const name = modal.querySelector('.name').value;
    const gender = modal.querySelector('.gender').value;
    const age = modal.querySelector('.age').value;
    const usage = modal.querySelector('.usage').value;
    const dropRate = modal.querySelector('.dropRate').value;
    const startTime = modal.querySelector('.startTime').value;

    // 根据门诊号和药品组号更新表格显示内容
    if (modalData[modalId] && modalData[modalId].selectedRecordSn) {
        updateMedicineTable(cardId, modalData[modalId].medicineData);
    } else {
        alert('请先选择药品组号');
        return;
    }

    // 如果没有收集到滴速则不能开始
    if(!dropRate)
    {
        alert("请输入滴速！");
        return;
    }

    // 关闭模态窗口
    closeModal(modalId);

    let maxDosage = Math.max(...modalData[modalId].medicineData.map(medicine => medicine.dosage));    
    // 输液背景改变， 液体余量更新
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
            <td>${medicine.persist_days}</td>
        `;
    });
}

function updateCard(cardId, data) {
    const card = document.getElementById(cardId);
    if (card) {
        card.querySelector('.department').textContent = data.department;
        card.querySelector('.patient-id').textContent = data.patientID;
        card.querySelector('.patient-info').textContent = `${data.name} ${data.gender} ${data.age}岁`;
        card.querySelector('.usage').textContent = `${data.usage}`;
        card.querySelector('.drop-rate').textContent = `${data.dropRate}`;
        card.querySelector('.startTime').textContent = `${data.startTime}`;
        
        // 更新卡片状态
        card.classList.add('infusion-started');
    }
}

function addCard() {
    if (!allCardsInUse()) {
        alert('请先使用所有现有的卡片后再添加新卡片。');
        return;
    }

    const content = document.querySelector('.content');
    const addCard = document.querySelector('.add-card');

    patientCount++;

    const cardId = `patient${patientCount}`;
    const modalId = `patient${patientCount}Modal}`;

    // 创建新卡片
    const newCard = document.createElement('div');
    newCard.className = 'card';
    newCard.id = cardId;
    newCard.innerHTML = `
            <div class="liquid-overlay"></div>
            <div class="card-content">
                科室: <span class="department"></span><br>
                门诊号: <span class="patient-id"></span><br>
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
                            <th>天数</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- 药品信息将在这里动态插入 -->
                    </tbody>
                </table>
            </div>
    `;
    newCard.ondblclick = () => showModal(modalId);

    newCard.style.zIndex = 1000-patientCount;
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
                <label for="patientID">门诊号：</label>
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
                <input type="text" class="name" readonly placeholder="门诊号扫描后自动生成">
            </div>
            <div class="form-row">
                <label for="gender">性别：</label>
                <input type="text" class="gender" readonly placeholder="门诊号扫描后自动生成">
            </div>
            <div class="form-row">
                <label for="age">年龄：</label>
                <input type="text" class="age" readonly placeholder="门诊号扫描后自动生成">
            </div>
            <div class="form-row">
                <label for="department">科室：</label>
                <input type="text" class="department" readonly placeholder="门诊号扫描后自动生成">
            </div>
            <div class="form-row">
                <label for="temperature">体温：</label>
                <input type="text" class="temperature" placeholder="请填写">
            </div>
            <div class="form-row">
                <label for="dropRate">滴速：</label>
                <input type="text" class="dropRate" placeholder="请填写，__滴/分钟">
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
    newModal.querySelector('.startInfusionButton').onclick = () =>  startInfusion(modalId, cardId);
    
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

function calculate() {
    // 这里应该实现实际的计算逻辑
    alert("计算液体剩余量");
}

function updateLiquidAmount(cardId, amount, modalId) {
    const card = document.getElementById(cardId);
    const liquidAmount = card.querySelector('.liquid-amount');
    const liquidOverlay = card.querySelector('.liquid-overlay');
    
    liquidAmount.textContent = `${amount.toFixed(2)}ml`;
    liquidOverlay.style.height = `${100 - 100 * (amount / modalData[modalId].medicineData[0]['dosage'])}%`;
    
    if (amount <= 0 || (deviceStatuses[modalId] && deviceStatuses[modalId].lockSwitch == "已锁死!")) {
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

    // card.style.opacity = '0.5';
    
    setTimeout(() => {
        message.style.opacity = '0.95';
        message.style.zIndex = '1002';
    }, 50);
}

// 实时更新剩余液体容量
function simulateRealTimeUpdate(cardId, dosage, modalId, dropRate) {
    let amount = dosage;
    const interval = setInterval(() => {
        amount -= (0.05 * (dropRate / 60));
        updateLiquidAmount(cardId, amount, modalId);
        if (amount <= 0 || (deviceStatuses[modalId] && deviceStatuses[modalId].lockSwitch == "已锁死!")) {
            clearInterval(interval);
        }
    }, 1000); // 每秒更新一次
}

// 完成输液后更新sy_record
function completeInfusion(modalId) {
    const modalElement = document.getElementById(modalId);
    const patientID = modalElement.querySelector('.patientID').value;
    const selectedRecordSn = modalData[modalId]['selectedRecordSn'];
    console.log(selectedRecordSn);

    // 调用 API 更新 SyRecord
    fetch('/api/update-syrecord/', {
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
            console.log('SyRecord 更新成功:', data.message);
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
    const Interval =setInterval(() => {
        const deviceNumber = deviceStatuses[modalId].deviceNumber;
        fetch(`/api/check-device-status/${deviceNumber}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    deviceStatuses[modalId].lockSwitch = data.sbflag;
                    if (data.sbflag == "已锁死!") {
                        clearInterval(Interval);
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
document.querySelector('#patient1Modal .startInfusionButton').onclick = () =>  startInfusion('patient1Modal', 'patient1');
addHoverListeners(document.getElementById('patient1'));


