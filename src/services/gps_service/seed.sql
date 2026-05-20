DO $$ 
DECLARE
    museum_id UUID;
    park_id UUID;
    food_id UUID;
    transport_id UUID;
    landmark_id UUID;
    shop_id UUID;
    admin_id UUID;
BEGIN
    -- Получаем ID категорий
    SELECT type_id INTO museum_id FROM point_types WHERE name = 'museum' LIMIT 1;
    SELECT type_id INTO park_id FROM point_types WHERE name = 'park' LIMIT 1;
    SELECT type_id INTO food_id FROM point_types WHERE name = 'food' LIMIT 1;
    SELECT type_id INTO transport_id FROM point_types WHERE name = 'transport' LIMIT 1;
    SELECT type_id INTO landmark_id FROM point_types WHERE name = 'landmark' LIMIT 1;
    SELECT type_id INTO shop_id FROM point_types WHERE name = 'shop' LIMIT 1;
    
    -- Получаем ID админа
    SELECT user_id INTO admin_id FROM users WHERE email = 'admin2@test.com' LIMIT 1;
    IF admin_id IS NULL THEN
        SELECT user_id INTO admin_id FROM users LIMIT 1;
    END IF;

    -- Вставка точек
    INSERT INTO points (point_id, name, latitude, longitude, type_id, description, created_by, created_at) VALUES
    -- Музеи
    (gen_random_uuid(), 'Государственная Третьяковская галерея', 55.7415, 37.6208, museum_id, 'Главный музей русского национального искусства', admin_id, now()),
    (gen_random_uuid(), 'Музей космонавтики', 55.8224, 37.6391, museum_id, '108-метровый монумент "Покорителям космоса"', admin_id, now()),
    (gen_random_uuid(), 'Музей Москвы', 55.7404, 37.5943, museum_id, 'История столицы от древности до наших дней. Макеты Китай-города и Белого города.', admin_id, now()),
    (gen_random_uuid(), 'Дом-музей В.М. Васнецова', 55.7638, 37.5879, museum_id, 'Мастерская знаменитого художника в сказочном тереме.', admin_id, now()),
    (gen_random_uuid(), 'Новая Третьяковка', 55.7373, 37.6058, museum_id, 'Музей искусства XX века на Крымском Валу. Кандинский, Малевич, Пикассо.', admin_id, now()),

    
    -- Парки
    (gen_random_uuid(), 'Парк Зарядье', 55.7512, 37.6286, park_id, 'Новый парк с парящим мостом над Москвой-рекой', admin_id, now()),
    (gen_random_uuid(), 'Парк Горького', 55.7288, 37.6002, park_id, 'Главный парк столицы', admin_id, now()),
    (gen_random_uuid(), 'Сад Эрмитаж', 55.7703, 37.6036, park_id, 'Уютный исторический сад в центре', admin_id, now()),
    (gen_random_uuid(), 'Александровский сад', 55.7527, 37.6142, park_id, 'Сад у стен Кремля с Постом №1 у Вечного огня.', admin_id, now()),
    (gen_random_uuid(), 'Нескучный сад', 55.7204, 37.5952, park_id, 'Самый старый парк Москвы. Андреевский пруд и Охотничий домик.', admin_id, now()),
    
    -- Еда
    (gen_random_uuid(), 'Кафе Пушкинъ', 55.7648, 37.6058, food_id, 'Легендарный ресторан в особняке XIX века', admin_id, now()),
    (gen_random_uuid(), 'Даниловский рынок', 55.7127, 37.6229, food_id, 'Модное гастро-пространство', admin_id, now()),
    (gen_random_uuid(), 'Депо. Лесная', 55.7767, 37.5805, food_id, 'Гигантский фуд-молл в здании бывшего трамвайного депо. 50+ ресторанов.', admin_id, now()),
    (gen_random_uuid(), 'Центральный рынок', 55.7618, 37.6157, food_id, 'Старый московский рынок с мясными и сырными лавками.', admin_id, now()),
    (gen_random_uuid(), 'Винзавод. Нефедовъ', 55.7485, 37.6493, food_id, 'Гастро-бар с огромной винной картой и сырными тарелками.', admin_id, now()),
    (gen_random_uuid(), 'Кофейня "Кофе и Шоколад"', 55.7602, 37.6135, food_id, 'Маленькая кофейня рядом с Большим театром. Лучший горячий шоколад.', admin_id, now()),
    
    -- Транспорт
    (gen_random_uuid(), 'Метро Маяковская', 55.7700, 37.5963, transport_id, 'Шедевр сталинского ар-деко', admin_id, now()),
    (gen_random_uuid(), 'Метро Площадь Революции', 55.7567, 37.6218, transport_id, 'Знаменитая станция с бронзовыми скульптурами "советских людей".', admin_id, now()),
    (gen_random_uuid(), 'Метро Киевская (кольцевая)', 55.7443, 37.5662, transport_id, 'Станция украшена мозаикой с сюжетами дружбы народов.', admin_id, now()),

    
    -- Достопримечательности
    (gen_random_uuid(), 'Красная площадь', 55.7537, 37.6213, landmark_id, 'Главная площадь страны', admin_id, now()),
    (gen_random_uuid(), 'Собор Василия Блаженного', 55.7525, 37.6230, landmark_id, 'Символ России', admin_id, now()),
    (gen_random_uuid(), 'Большой театр', 55.7602, 37.6186, landmark_id, 'Знаменитый театр', admin_id, now()),
    (gen_random_uuid(), 'Москва-Сити', 55.7476, 37.5395, landmark_id, 'Деловой центр Москвы с высотками-гигантами. Панорамный вид с 89 этажа.', admin_id, now()),
    (gen_random_uuid(), 'Храм Христа Спасителя', 55.7447, 37.6055, landmark_id, 'Главный кафедральный собор РПЦ. Смотровая площадка под куполом.', admin_id, now()),
    
    -- Магазины
    (gen_random_uuid(), 'ГУМ', 55.7548, 37.6216, shop_id, 'Главный универмаг России', admin_id, now()),
    (gen_random_uuid(), 'ЦУМ', 55.7562, 37.6147, shop_id, 'Легендарный универмаг на Петровке. Gucci, Prada, Dior.', admin_id, now()),
    (gen_random_uuid(), 'ТРЦ Авиапарк', 55.7915, 37.5358, shop_id, 'Один из крупнейших ТРЦ Европы. Самый большой аквапарк в помещении.', admin_id, now()),
    (gen_random_uuid(), 'Никольская улица', 55.7556, 37.6248, shop_id, 'Главная пешеходная улица с магазинами, кафе и тысячами гирлянд.', admin_id, now());
    
END $$;