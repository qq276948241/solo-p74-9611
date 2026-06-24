const petService = require('../services/petService');
const { success, paginate } = require('../utils/response');

function createPet(req, res, next) {
  try {
    const pet = petService.createPet(req.user.id, req.body);
    res.status(201).json(success(pet, '宠物档案创建成功'));
  } catch (err) {
    next(err);
  }
}

function getPet(req, res, next) {
  try {
    const pet = petService.getPetById(parseInt(req.params.id));
    res.json(success(pet));
  } catch (err) {
    next(err);
  }
}

function listMyPets(req, res, next) {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const result = petService.listPetsByOwner(req.user.id, parseInt(page), parseInt(pageSize));
    res.json(success(paginate(result.list, result.total, parseInt(page), parseInt(pageSize))));
  } catch (err) {
    next(err);
  }
}

function updatePet(req, res, next) {
  try {
    const pet = petService.updatePet(parseInt(req.params.id), req.user.id, req.body);
    res.json(success(pet, '更新成功'));
  } catch (err) {
    next(err);
  }
}

function deletePet(req, res, next) {
  try {
    petService.deletePet(parseInt(req.params.id), req.user.id);
    res.json(success(null, '删除成功'));
  } catch (err) {
    next(err);
  }
}

module.exports = { createPet, getPet, listMyPets, updatePet, deletePet };
