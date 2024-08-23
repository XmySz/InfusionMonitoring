from django.db import models


class UserInfo(models.Model):
    name = models.CharField(max_length=100)
    sex = models.CharField(max_length=10)
    telephone = models.CharField(max_length=15)

    def __str__(self):
        return self.name

    class Meta:
        db_table = "TestDjango"


class Device(models.Model):
    create_date = models.DateTimeField(null=True, blank=True)
    mac = models.CharField(max_length=100, unique=True, primary_key=True)
    flag = models.CharField(max_length=300, null=True, blank=True)
    dl = models.CharField(max_length=2, null=True, blank=True)
    sbflag = models.CharField(max_length=2, null=True, blank=True)
    updatetime = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return self.mac

    class Meta:
        db_table = "device"


class SyRecord(models.Model):
    # 输液记录
    p_id = models.CharField(max_length=12, primary_key=True)
    p_name = models.CharField(max_length=32)
    sex = models.CharField(max_length=2)
    age = models.PositiveSmallIntegerField()
    age_unit = models.CharField(max_length=2)
    ks = models.CharField(max_length=50)
    record_sn = models.IntegerField()
    item_sn = models.PositiveSmallIntegerField()
    prescription_sn = models.SmallIntegerField()
    yp_name = models.CharField(max_length=100)
    specification = models.CharField(max_length=64)
    charge_price = models.DecimalField(max_digits=12, decimal_places=3)
    charge_amount = models.DecimalField(max_digits=9, decimal_places=0)
    dosage = models.DecimalField(max_digits=12, decimal_places=2)
    dw = models.CharField(max_length=16)
    yf = models.CharField(max_length=100)
    persist_days = models.SmallIntegerField()
    print_name = models.CharField(max_length=100)
    comment = models.CharField(max_length=64)
    f1 = models.CharField(max_length=2)
    f2 = models.CharField(max_length=2)
    rq = models.DateTimeField()
    mac = models.CharField(max_length=100, null=True, blank=True)
    bh = models.CharField(max_length=100, null=True, blank=True)
    f3 = models.CharField(max_length=100, null=True, blank=True)
    f4 = models.CharField(max_length=100, null=True, blank=True)

    def __str__(self):
        return self.p_id

    class Meta:
        db_table = "sy_record"


class ZyRecord(models.Model):

    # 住院输液记录
    inpatient_no = models.CharField(max_length=12, primary_key=True)
    XM = models.CharField(max_length=32)
    sex = models.CharField(max_length=1)
    birthday = models.DateTimeField()
    nl = models.CharField(max_length=8)
    KS = models.CharField(max_length=50, null=True, blank=True)
    ZD = models.CharField(max_length=150)
    bed_no = models.CharField(max_length=8)
    order_sn = models.FloatField(null=True, blank=True)
    order_code = models.CharField(max_length=6, null=True, blank=True)
    doseage = models.FloatField()
    JLDW = models.CharField(max_length=16, null=True, blank=True)
    order_name = models.CharField(max_length=128)
    drug_specification = models.CharField(max_length=50)
    charge_amount = models.FloatField()
    supply_name = models.CharField(max_length=32)
    frequ_code = models.CharField(max_length=10)
    execute_time = models.DateTimeField()
    long_once_flag = models.CharField(max_length=1, null=True, blank=True)
    p_order_sn = models.FloatField()
    order_long_id = models.IntegerField()
    first_times = models.PositiveSmallIntegerField()
    last_times = models.PositiveSmallIntegerField()
    f1 = models.CharField(max_length=2, null=True, blank=True)

    def __str__(self):
        return self.inpatient_no

    class Meta:
        db_table = "zy_rec"


class PatientInfusionInformation(models.Model):
    # 患者输液信息表

    name = models.CharField(max_length=100)
    gender = models.CharField(max_length=100)
    department = models.CharField(max_length=100)
    bedNum = models.CharField(max_length=100)
    usage = models.CharField(max_length=100)
    startTime = models.TimeField()
    residualLiquid = models.CharField(max_length=100)
    cardId = models.CharField(max_length=100, primary_key=True)
    liquidHeight = models.CharField(max_length=100)
    switchStatu = models.CharField(max_length=100)

    def __str__(self):
        return self.inpatient_no

    class Meta:
        db_table = "patientInfusionInformation"
