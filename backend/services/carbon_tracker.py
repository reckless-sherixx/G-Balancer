# services/carbon_tracker.py

# India grid emission factor (kg CO2 per kWh)
INDIA_GRID_EMISSION_FACTOR = 0.82   # Central Electricity Authority 2023 data

def calculate_carbon_saved(solar_mwh: float, wind_mwh: float) -> dict:
    """
    How much CO2 was avoided by using renewables instead of coal.
    """
    renewable_kwh = (solar_mwh + wind_mwh) * 1000
    co2_saved_kg  = renewable_kwh * INDIA_GRID_EMISSION_FACTOR
    co2_saved_ton = co2_saved_kg / 1000
    
    # Carbon credit price (approx ₹800 per tonne in India)
    carbon_credit_value_inr = co2_saved_ton * 800
    
    return {
        "renewable_kwh":            round(renewable_kwh, 2),
        "co2_saved_kg":             round(co2_saved_kg, 2),
        "co2_saved_tonnes":         round(co2_saved_ton, 4),
        "carbon_credits_earned":    round(co2_saved_ton, 4),
        "credit_value_inr":         round(carbon_credit_value_inr, 2),
        "equivalent_trees_planted": round(co2_saved_ton * 45, 0),  # 1 tree ≈ 22kg CO2/yr
        "equivalent_cars_off_road": round(co2_saved_ton / 2.3, 2)
    }# services/carbon_tracker.py

# India grid emission factor (kg CO2 per kWh)
INDIA_GRID_EMISSION_FACTOR = 0.82   # Central Electricity Authority 2023 data

def calculate_carbon_saved(solar_mwh: float, wind_mwh: float) -> dict:
    """
    How much CO2 was avoided by using renewables instead of coal.
    """
    renewable_kwh = (solar_mwh + wind_mwh) * 1000
    co2_saved_kg  = renewable_kwh * INDIA_GRID_EMISSION_FACTOR
    co2_saved_ton = co2_saved_kg / 1000
    
    # Carbon credit price (approx ₹800 per tonne in India)
    carbon_credit_value_inr = co2_saved_ton * 800
    
    return {
        "renewable_kwh":            round(renewable_kwh, 2),
        "co2_saved_kg":             round(co2_saved_kg, 2),
        "co2_saved_tonnes":         round(co2_saved_ton, 4),
        "carbon_credits_earned":    round(co2_saved_ton, 4),
        "credit_value_inr":         round(carbon_credit_value_inr, 2),
        "equivalent_trees_planted": round(co2_saved_ton * 45, 0),  # 1 tree ≈ 22kg CO2/yr
        "equivalent_cars_off_road": round(co2_saved_ton / 2.3, 2)
    }