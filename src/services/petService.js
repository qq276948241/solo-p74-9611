const petRepo = require('../repositories/petRepo');
const userRepo = require('../repositories/userRepo');

function createPet(ownerId, petData) {
  const user = userRepo.findById(ownerId);
  if (!user) {
    const err = new Error('用户不存在');
    err.status = 404;
    throw err;
  }

  const pet = petRepo.create({
    owner_id: ownerId,
    name: petData.name,
    breed: petData.breed,
    age: petData.age,
    weight: petData.weight || 0,
    gender: petData.gender || 'unknown',
    vaccination_records: JSON.stringify(petData.vaccination_records || []),
    personality_notes: petData.personality_notes || '',
    photo_urls: JSON.stringify(petData.photo_urls || [])
  });

  return parsePetJson(pet);
}

function getPetById(id) {
  const pet = petRepo.findById(id);
  if (!pet) {
    const err = new Error('宠物不存在');
    err.status = 404;
    throw err;
  }
  return parsePetJson(pet);
}

function listPetsByOwner(ownerId, page, pageSize) {
  const result = petRepo.findByOwnerId(ownerId, page, pageSize);
  return {
    list: result.list.map(parsePetJson),
    total: result.total
  };
}

function updatePet(id, ownerId, data) {
  const pet = petRepo.findById(id);
  if (!pet) {
    const err = new Error('宠物不存在');
    err.status = 404;
    throw err;
  }
  if (pet.owner_id !== ownerId) {
    const err = new Error('无权修改该宠物档案');
    err.status = 403;
    throw err;
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.breed !== undefined) updateData.breed = data.breed;
  if (data.age !== undefined) updateData.age = data.age;
  if (data.weight !== undefined) updateData.weight = data.weight;
  if (data.gender !== undefined) updateData.gender = data.gender;
  if (data.vaccination_records !== undefined) updateData.vaccination_records = JSON.stringify(data.vaccination_records);
  if (data.personality_notes !== undefined) updateData.personality_notes = data.personality_notes;
  if (data.photo_urls !== undefined) updateData.photo_urls = JSON.stringify(data.photo_urls);

  const updated = petRepo.update(id, updateData);
  return parsePetJson(updated);
}

function deletePet(id, ownerId) {
  const pet = petRepo.findById(id);
  if (!pet) {
    const err = new Error('宠物不存在');
    err.status = 404;
    throw err;
  }
  if (pet.owner_id !== ownerId) {
    const err = new Error('无权删除该宠物档案');
    err.status = 403;
    throw err;
  }
  petRepo.remove(id);
}

function parsePetJson(pet) {
  if (!pet) return pet;
  return {
    ...pet,
    vaccination_records: JSON.parse(pet.vaccination_records || '[]'),
    photo_urls: JSON.parse(pet.photo_urls || '[]')
  };
}

module.exports = { createPet, getPetById, listPetsByOwner, updatePet, deletePet };
