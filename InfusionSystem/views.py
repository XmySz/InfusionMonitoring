from django.shortcuts import render, redirect
from django import forms
from django.utils import timezone
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from datetime import datetime
from dateutil.relativedelta import relativedelta
import json
import pytz

from .models import UserInfo, Device, SyRecord, ZyRecord


def calculate_age(born):
    # 设置中国时区
    china_tz = pytz.timezone('Asia/Shanghai')
    
    # 获取当前中国时间
    today = datetime.now(china_tz)
    
    # 如果born没有时区信息，假设它也是中国时间
    if born.tzinfo is None:
        born = china_tz.localize(born)
    else:
        # 如果born有时区信息，将其转换为中国时区
        born = born.astimezone(china_tz)

    diff = relativedelta(today, born)

    if diff.years > 0:
        return f"{diff.years} 岁"
    elif diff.months > 0:
        return f"{diff.months} 个月"
    elif diff.days > 0:
        return f"{diff.days} 天"
    else:
        return f"{diff.hours} 小时"


def index(request):
    return render(request, 'index.html')


class UserInfoForm(forms.ModelForm):
    class Meta:
        model = UserInfo
        fields = ['name', 'sex', 'telephone']


def collect_user_info(request):
    if request.method == 'POST':
        form = UserInfoForm(request.POST)
        if form.is_valid():
            form.save()
            return redirect('success')
    else:
        form = UserInfoForm()

    return render(request, 'collect_user_info.html', {'form': form})


def success(request):
    return render(request, 'success.html')


def infusion_system(request):
    return render(request, 'infusion_system_large_screen.html')


@require_http_methods(["GET"])
def scan_device(request, device_number):
    try:
        device = Device.objects.get(mac=device_number)

        if device.sbflag=='0A':
            device.sbflag = "正在监控..."
        else:
            device.sbflag = "已锁死!"
        

        if device.dl == '00':
            device.dl = "<0%"
        elif device.dl == '01':
            device.dl = "0%-16%"
        elif device.dl == '02':
            device.dl = "16%-32%"
        elif device.dl == '03':
            device.dl = "32%-48%"
        elif device.dl == '04':
            device.dl = "48%-64%"
        elif device.dl == '05':
            device.dl = "64%-80%"
        elif device.dl == '06':
            device.dl = ">80%"
        else:
            device.dl = "电量状态异常"

        return JsonResponse({
            'success': True,
            'sbflag': device.sbflag,
            'dl': device.dl,
            'create_date': device.create_date.strftime('%Y-%m-%d %H:%M:%S')
        })
    except Device.DoesNotExist:
        return JsonResponse({'success': False}, status=404)
    except Exception as e:
        print(e)
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
    

@require_http_methods(["GET"])
def scan_patient_mz(request, patient_id):
    try:
        patients = SyRecord.objects.filter(p_id=patient_id)
        patient = patients.first()

        if not patient:
            return JsonResponse({'success': False, 'message': '未找到患者记录'}, status=404)

        # 创建一个字典来存储每个record_cn对应的药品列表
        record_sn_data = {}
        for p in patients:
            if SyRecord.objects.filter(p_id=patient_id, record_sn=p.record_sn, f1=1).exists():
                # 如果有f1=1的记录，跳过这个record_sn组
                continue
            else:
                if p.record_sn not in record_sn_data:
                    record_sn_data[p.record_sn] = []
                record_sn_data[p.record_sn].append({
                    'yf': p.yf,
                    'yp_name': p.yp_name,
                    'specification': p.specification,
                    'charge_amount': int(p.charge_amount),
                    'dosage': round(p.dosage, 2),
                    'print_name': p.print_name,
                    'persist_days': p.persist_days,
                    'charge_price': p.charge_price,
                    'dw': p.dw,
                })

        if patient.sex == '2':
            patient.sex = '女'
        elif patient.sex == '1':
            patient.sex = '男'
        else:
            patient.sex = '未知'
        
        return JsonResponse({
            'success': True,
            'p_name': patient.p_name,
            'sex': patient.sex,
            'age': patient.age,
            'ks': patient.ks,
            'record_sn_data': record_sn_data,
        })
    except SyRecord.DoesNotExist:
        return JsonResponse({'success': False}, status=404)
    except Exception as e:
        print(e)
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def update_syrecord(request):
    try:
        data = json.loads(request.body)
        record_sn = data.get('record_sn')
        p_id = data.get('p_id')

        if not record_sn or not p_id:
            return JsonResponse({'success': False, 'message': '缺少必要参数'}, status=400)

        # 更新 SyRecord 表中符合条件的所有记录
        updated = SyRecord.objects.filter(record_sn=record_sn, p_id=p_id).update(f1=1)

        if updated:
            return JsonResponse({'success': True, 'message': f'成功更新 {updated} 条记录'})
        else:
            return JsonResponse({'success': False, 'message': '未找到匹配的记录'}, status=404)

    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
    

@csrf_exempt
@require_http_methods(["POST"])
def update_zyrecord(request):
    try:
        data = json.loads(request.body)
        record_sn = data.get('record_sn')
        p_id = data.get('p_id')

        print(record_sn, p_id)

        if not record_sn or not p_id:
            return JsonResponse({'success': False, 'message': '缺少必要参数'}, status=400)

        # 更新 ZyRecord 表中符合条件的所有记录
        updated = ZyRecord.objects.filter(order_long_id=record_sn, inpatient_no=p_id).update(f1=1)

        if updated:
            return JsonResponse({'success': True, 'message': f'成功更新 {updated} 条记录'})
        else:
            return JsonResponse({'success': False, 'message': '未找到匹配的记录'}, status=404)

    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@require_http_methods(["GET"])
def check_device_status(request, device_number):
    try:
        device = Device.objects.get(mac=device_number)

        if device.sbflag=='0A':
            device.sbflag = "正在监控..."
        elif device.sbflag=='1A':
            device.sbflag = "已锁死!"
        else:
            device.sbflag = "锁状态异常"
        
        return JsonResponse({
            'success': True,
            'sbflag': device.sbflag,
        })
    except Device.DoesNotExist:
        return JsonResponse({'success': False}, status=404)
    except Exception as e:
        print(e)
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
    

def infusion_system_zy(request):
    return render(request, 'infusion_system_large_screen_zy.html')


@require_http_methods(["GET"])
def scan_patient_zy(request, patient_id):
    try:
        patients = ZyRecord.objects.filter(inpatient_no=patient_id)
        patient = patients.first()

        if not patient:
            return JsonResponse({'success': False, 'message': '未找到患者记录'}, status=404)

        # 创建一个字典来存储每个record_sn对应的药品列表
        record_sn_data = {}
        for p in patients:
            if ZyRecord.objects.filter(inpatient_no=patient_id, order_long_id=p.order_long_id, f1=1).exists():
                # 如果有f1=1的记录，跳过这个record_sn组
                continue
            else:
                if p.order_long_id not in record_sn_data:
                    record_sn_data[p.order_long_id] = []
                record_sn_data[p.order_long_id].append({
                    'yf': p.supply_name,                        # 用法
                    'yp_name': p.order_name,                    # 药品名称
                    'specification': p.drug_specification,      # 规格
                    'charge_amount': int(p.charge_amount),      # 数量
                    'dosage': round(p.doseage, 2),              # 剂量
                    'dw': p.JLDW,                               # 单位
                    'print_name': p.frequ_code                  # 次数
                })

        if patient.sex == '2':
            patient.sex = '女'
        elif patient.sex == '1':
            patient.sex = '男'
        else:
            patient.sex = '未知'

        age = calculate_age(patient.birthday)

        return JsonResponse({
            'success': True,
            'XM': patient.XM,
            'sex': patient.sex,
            'age': age,
            'KS': patient.KS,
            'bed_no': patient.bed_no,
            'record_sn_data': record_sn_data,
        })
    except ZyRecord.DoesNotExist:
        return JsonResponse({'success': False}, status=404)
    except Exception as e:
        print(e)
        return JsonResponse({'success': False, 'message': str(e)}, status=500)