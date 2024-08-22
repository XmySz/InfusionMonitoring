from datetime import datetime
from dateutil.relativedelta import relativedelta

def calculate_age(born):
    today = datetime.now()
    diff = relativedelta(today, born)
    
    if diff.years > 0:
        return f"{diff.years} 岁"
    elif diff.months > 0:
        return f"{diff.months} 个月"
    elif diff.days > 0:
        return f"{diff.days} 天"
    else:
        return f"{diff.hours} 小时"
    
print(calculate_age(datetime("2021-05-28 10:29:40:000")))