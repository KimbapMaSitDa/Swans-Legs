/* =====================================================================
   Leg page – image list and recognition data (14 pages)

   - name      : image file name (shown as "Name")
   - sharpness : sharpness score 0–100 of the main object (below 40 → Blurred)
   - code    : content type  A Human / B Animal / C Object / D Scene / E Mixed
   - object  : [OBJECT]  OB01, OB02 … → 4 corner points (x,y) of each object box
   - mark    : [MARK]    Hd, Fc → 4 corner points / LE, RE, Ns, Mt → one point (x,y)

   All coordinates are pixels in the 1456 × 816 image (site/images/*.jpg),
   origin = top-left corner. [OBJECT] and [MARK] values are independent.
   An item with no objects is reported as "Undetected".

   BOUNDARY and STATUS are NOT written here – leg.js calculates them from
   these coordinates (and a sharpness score measured on the image itself).
   ===================================================================== */
window.LEG_IMAGE_SIZE = { w: 1456, h: 816 };

// rectangle helper: (x1,y1)-(x2,y2) → 4 corners clockwise from top-left
const R = (x1, y1, x2, y2) => [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];

window.LEG_ITEMS = [
  { // 1
    name: 'laidPuppy_1', sharpness: 72, code: 'B',
    object: { OB01: R(280, 30, 1456, 770) },
    mark: { Hd: R(290, 50, 1440, 760), Fc: R(540, 300, 1100, 705),
            LE: [635, 390], RE: [985, 435], Ns: [730, 610], Mt: [760, 690] },
  },
  { // 2
    name: 'blanketCat_2', sharpness: 85, code: 'B',
    object: { OB01: R(330, 55, 1110, 735) },
    mark: { Hd: R(440, 55, 1000, 600), Fc: R(520, 330, 960, 620),
            LE: [627, 437], RE: [858, 458], Ns: [718, 575], Mt: [720, 605] },
  },
  { // 3
    name: 'pinkCore_3', sharpness: 30, code: 'C',
    object: { OB01: R(560, 130, 1190, 780), OB02: R(200, 20, 730, 420), OB03: R(1090, 50, 1456, 520) },
    mark: {},
  },
  { // 4
    name: 'angelCore_4', sharpness: 80, code: 'E',
    object: { OB01: R(400, 210, 1030, 816), OB02: R(0, 530, 235, 700) },
    mark: { Hd: R(805, 235, 995, 415), Fc: R(840, 290, 950, 405),
            LE: [875, 342], RE: [928, 350], Ns: [893, 368], Mt: [895, 388] },
  },
  { // 5
    name: 'studyRoutine_5', sharpness: 88, code: 'A',
    object: { OB01: R(630, 0, 1456, 640) },
    mark: { Hd: R(655, 5, 985, 325), Fc: R(760, 190, 905, 325),
            LE: [805, 262], RE: [830, 272], Ns: [795, 298], Mt: [808, 314] },
  },
  { // 6
    name: 'cooking_6', sharpness: 82, code: 'D',
    object: { OB01: R(530, 40, 1350, 530), OB02: R(430, 550, 1140, 750), OB03: R(1115, 550, 1325, 640) },
    mark: {},
  },
  { // 7
    name: 'greenaryForest_7', sharpness: 70, code: 'D',
    object: { OB01: R(400, 150, 600, 600), OB02: R(700, 250, 1200, 600) },
    mark: {},
  },
  { // 8
    name: 'action_8', sharpness: 60, code: 'E',
    object: { OB01: R(425, 290, 780, 816), OB02: R(205, 595, 1456, 816) },
    mark: { Hd: R(570, 290, 670, 390) },          // seen from behind: no face landmarks
  },
  { // 9
    name: 'sf_9', sharpness: 65, code: 'E',
    object: { OB01: R(680, 205, 900, 248), OB02: R(980, 305, 1145, 328), OB03: R(820, 320, 862, 330) },
    mark: {},
  },
  { // 10
    name: 'skin_10', sharpness: 75, code: 'A',
    object: {},                                  // no object found → Undetected
    mark: {},
  },
  { // 11
    name: 'oyster_11', sharpness: 92, code: 'C',
    object: { OB01: R(555, 98, 922, 722) },
    mark: {},
  },
  { // 12
    name: 'redMarbles_12', sharpness: 78, code: 'C',
    object: { OB01: R(1005, 235, 1180, 425), OB02: R(495, 470, 600, 580) },
    mark: {},
  },
  { // 13
    name: 'faces_13', sharpness: 74, code: 'A',
    object: { OB01: R(600, 400, 1260, 800) },
    mark: { Hd: R(600, 400, 1260, 800), Fc: R(625, 420, 1250, 795),
            LE: [690, 495], RE: [1065, 545], Ns: [820, 610], Mt: [1170, 715] },
  },
  { // 14
    name: 'subway_14', sharpness: 18, code: 'A',
    object: { OB01: R(660, 260, 870, 480) },
    mark: { Hd: R(700, 280, 810, 395), Fc: R(715, 300, 800, 390),
            LE: [735, 325], RE: [762, 326], Ns: [750, 345], Mt: [752, 366] },
  },
];
