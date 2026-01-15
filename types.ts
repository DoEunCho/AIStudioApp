
export enum ToolId {
  MagicEditor = 'magic-editor',
  SketchToWebtoon = 'sketch-to-webtoon',
  IDPhotoMaker = 'id-photo-maker',
  FaceHairChanger = 'face-hair-changer',
  FutureBaby = 'future-baby',
  AdPosterMaker = 'ad-poster-maker',
  TimeTraveler = 'time-traveler',
  VirtualModelFitting = 'virtual-model-fitting',
  ItemSynthesis = 'item-synthesis',
  PersonaChat = 'persona-chat',
  Character360 = 'character-360',
}

export interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}
